import { Injectable, Logger } from '@nestjs/common';
import { AssignmentStatus, BookingStatus, TourType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { rootFromProfile, sortByRootDistance } from '@/geo/distance';

/** A trip (bus) carrying at most 12 passengers — per bookingflow.md step 3. */
const BUS_MAX_PAX = 12;

/**
 * Manual operations on the Dispatch Board (NOT automatic):
 * - Drag and drop bookings between buses (reorder / move)
 * - Remove a booking from a trip when the order is cancelled (unassign)
 *
 * The auto-assign engine has been removed — each bus is currently assigned
 * manually (see AssignmentOrigin.MANUAL / AUTO_ASSIGN).
 */
@Injectable()
export class AssignmentBoardService {
  private readonly logger = new Logger(AssignmentBoardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Cancel an order → remove the booking from the trip and re-sequence that trip. */
  async unassign(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || !booking.assignmentId) return { skipped: true };
    const assignmentId = booking.assignmentId;
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { assignmentId: null, paxSequence: 0 },
    });
    await this.resequence(assignmentId);
    await this.refreshSummary(assignmentId);
    await this.geoSort(assignmentId);
    return { unassigned: true, assignmentId };
  }

  /** Re-sequence the passengers on a bus (per the order the admin dragged them into). */
  async reorder(assignmentId: string, bookingIds: string[]) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { bookings: { select: { id: true } } },
    });
    if (!assignment) return { error: 'ASSIGNMENT_NOT_FOUND' };
    const owned = new Set(assignment.bookings.map((b) => b.id));
    if (bookingIds.some((id) => !owned.has(id))) {
      return { error: 'BOOKING_NOT_IN_ASSIGNMENT' };
    }
    await this.prisma.$transaction(
      bookingIds.map((id, i) =>
        this.prisma.booking.update({
          where: { id },
          data: { paxSequence: i + 1 },
        }),
      ),
    );
    await this.refreshSummary(assignmentId);
    await this.auditService.log({
      entityType: 'Assignment',
      entityId: assignmentId,
      action: 'REORDER_BOOKINGS',
      afterData: { bookingIds },
    });
    return { reordered: true };
  }

  /** Move a booking from this bus to another bus (drag and drop). */
  async move(fromAssignmentId: string, bookingId: string, toAssignmentId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || booking.assignmentId !== fromAssignmentId) {
      return { error: 'BOOKING_NOT_IN_SOURCE' };
    }
    const target = await this.prisma.assignment.findUnique({
      where: { id: toAssignmentId },
      include: { bookings: true, vehicle: true },
    });
    if (!target) return { error: 'TARGET_NOT_FOUND' };
    if (
      target.status !== AssignmentStatus.PENDING &&
      target.status !== AssignmentStatus.DISPATCHED
    ) {
      return { error: 'TARGET_NOT_OPEN' };
    }
    if (
      target.tourType &&
      booking.tourType &&
      target.tourType !== booking.tourType
    ) {
      return { error: 'TOUR_TYPE_MISMATCH' };
    }
    if (!this.canFit(target, booking.totalPax ?? 0)) {
      return { error: 'TARGET_FULL' };
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { assignmentId: null, paxSequence: 0 },
    });
    await this.resequence(fromAssignmentId);
    await this.attachBooking(toAssignmentId, bookingId);
    await this.refreshSummary(fromAssignmentId);
    await this.refreshSummary(toAssignmentId);
    await this.geoSort(fromAssignmentId);
    await this.geoSort(toAssignmentId);

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: toAssignmentId,
      action: 'MOVE_BOOKING',
      afterData: { bookingId, fromAssignmentId },
    });
    return { moved: true, toAssignmentId };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  /**
   * Attach a booking to a trip (used by auto-assign queue Stage 3).
   * Guard: the booking already has another assignment → do not attach it again.
   */
  async attach(
    assignmentId: string,
    bookingId: string,
  ): Promise<{ assigned: boolean; assignmentId?: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || booking.assignmentId) return { assigned: false };
    await this.attachBooking(assignmentId, bookingId);
    await this.refreshSummary(assignmentId);
    await this.geoSort(assignmentId);
    return { assigned: true, assignmentId };
  }

  private async attachBooking(assignmentId: string, bookingId: string) {
    const maxSeq = await this.prisma.booking.aggregate({
      where: { assignmentId },
      _max: { paxSequence: true },
    });
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        assignmentId,
        paxSequence: (maxSeq._max.paxSequence ?? 0) + 1,
        status: BookingStatus.ASSIGNED,
      },
    });
  }

  private canFit(assignment: any, pax: number): boolean {
    const used = assignment.bookings.reduce(
      (sum: number, b: any) => sum + (b.totalPax ?? 0),
      0,
    );
    const cap = Math.min(
      assignment.vehicle?.capacity ?? BUS_MAX_PAX,
      BUS_MAX_PAX,
    );
    return used + pax <= cap;
  }

  /**
   * Recalculate the trip summary (tourName/tourType/durationDays/totalPax)
   * from its bookings. Bookings missing lat/lng are looked up in the Coordinate
   * table by hotelName/address and written back.
   */
  private async refreshSummary(assignmentId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { assignmentId },
      include: { tour: { select: { durationDays: true, type: true, name: true } } },
      orderBy: { paxSequence: 'asc' },
    });

    for (const b of bookings) {
      if (b.latitude != null && b.longitude != null) continue;
      const key = b.hotelName ?? b.address;
      if (!key) continue;
      const match = await this.prisma.coordinate.findFirst({
        where: {
          OR: [
            { hotelName: { equals: key, mode: 'insensitive' } },
            { address: { equals: key, mode: 'insensitive' } },
          ],
        },
      });
      if (!match) continue;
      await this.prisma.booking.update({
        where: { id: b.id },
        data: {
          latitude: match.latitude,
          longitude: match.longitude,
          address: b.address ?? match.address,
        },
      });
      b.latitude = match.latitude;
      b.longitude = match.longitude;
    }

    const first = bookings[0];
    const tourName =
      bookings.find((b) => b.tourName)?.tourName ??
      first?.tour?.name ??
      undefined;
    const tourType =
      bookings.find((b) => b.tourType)?.tourType ??
      first?.tour?.type ??
      undefined;
    const durationDays = first?.tour?.durationDays ?? 1;
    const totalPax = bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);

    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { tourName, tourType, durationDays, totalPax },
    });
  }

  /** Renumber paxSequence 1..n following the trip's current order. */
  private async resequence(assignmentId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { assignmentId },
      orderBy: { paxSequence: 'asc' },
      select: { id: true },
    });
    await this.prisma.$transaction(
      bookings.map((b, i) =>
        this.prisma.booking.update({
          where: { id: b.id },
          data: { paxSequence: i + 1 },
        }),
      ),
    );
  }

  /**
   * Sort the bookings on a bus by increasing distance to the root coordinate
   * (nearest first — the passenger pickup order). Writes paxSequence 1..n back.
   * Bookings without coordinates are pushed to the end of the list.
   */
  async geoSort(assignmentId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { assignmentId },
      select: { id: true, latitude: true, longitude: true },
    });
    if (bookings.length <= 1) return;

    const profile = await this.prisma.companyProfile.findFirst();
    const root = rootFromProfile(profile);
    const ordered = sortByRootDistance(bookings, root);

    await this.prisma.$transaction(
      ordered.map((b, i) =>
        this.prisma.booking.update({
          where: { id: b.id },
          data: { paxSequence: i + 1 },
        }),
      ),
    );
  }
}