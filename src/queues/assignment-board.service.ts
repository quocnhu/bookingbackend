import { Injectable, Logger } from '@nestjs/common';
import { AssignmentStatus, TourType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';

/** Một chuyến xe (bus) chở tối đa 12 khách — theo bookingflow.md bước 3. */
const BUS_MAX_PAX = 12;

/**
 * Các thao tác "tay" trên Dispatch Board (KHÔNG tự động):
 * - Kéo-thả booking giữa các bus (reorder / move)
 * - Rút booking khỏi chuyến khi đơn bị hủy (unassign)
 *
 * Engine auto-assign đã bị gỡ — mỗi bus hiện chỉ gán bằng tay
 * (xem AssignmentOrigin.MANUAL / AUTO_ASSIGN).
 */
@Injectable()
export class AssignmentBoardService {
  private readonly logger = new Logger(AssignmentBoardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Hủy đơn → rút booking khỏi chuyến và xếp lại thứ tự chuyến đó. */
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
    return { unassigned: true, assignmentId };
  }

  /** Xếp lại thứ tự khách trong 1 bus (theo thứ tự list do admin kéo-thả). */
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

  /** Di chuyển booking từ bus này sang bus khác (kéo-thả). */
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

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: toAssignmentId,
      action: 'MOVE_BOOKING',
      afterData: { bookingId, fromAssignmentId },
    });
    return { moved: true, toAssignmentId };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
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
   * Tổng hợp lại thông tin chuyến (tourName/tourType/durationDays/totalPax)
   * từ bookings. Booking thiếu lat/lng sẽ được dò từ bảng Coordinate theo
   * hotelName/address và lưu ngược lại.
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

  /** Đánh số lại paxSequence 1..n theo thứ tự hiện tại của chuyến. */
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
}