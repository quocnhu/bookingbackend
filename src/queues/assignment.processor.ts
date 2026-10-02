import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  AssignmentOrigin,
  AssignmentStatus,
  BookingStatus,
  TourType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { AssignmentBoardService } from './assignment-board.service';
import { AutoCrewService } from './auto-crew.service';
import { ASSIGN_QUEUE } from './queue.constants';
import { AssignJobData } from './assignment.queue';

/** A trip (bus) carrying at most 12 passengers — per bookingflow.md. */
const BUS_MAX_PAX = 12;

/** Normalize a Date to YYYY-MM-DD string in UTC (date-only comparison). */
function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * BullMQ worker Stage 3: booking → Assignment.
 * Find an OPEN trip (DRAFT_ASSIGNED/PENDING) on the same date, with the same
 * tourType and enough capacity → attach the booking (status => ASSIGNED) and
 * refresh the summary. If no bus is found → the booking stays PENDING so the
 * admin can assign it manually on the Dispatch Board.
 */
@Injectable()
@Processor(ASSIGN_QUEUE, { concurrency: 5 })
export class AssignmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AssignmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly board: AssignmentBoardService,
    private readonly auditService: AuditService,
    private readonly autoCrew: AutoCrewService,
  ) {
    super();
  }

  async process(job: Job<AssignJobData>) {
    const { bookingId } = job.data;
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tour: true },
    });
    if (!booking) return { skipped: true, reason: 'BOOKING_NOT_FOUND' };
    if (booking.status === BookingStatus.CANCELED)
      return { skipped: true, reason: 'CANCELED' };
    if (booking.assignmentId)
      return {
        skipped: true,
        reason: 'ALREADY_ASSIGNED',
        assignmentId: booking.assignmentId,
      };
    if (!booking.startingDate)
      return { skipped: true, reason: 'NO_START_DATE' };

    const candidate = await this.findCandidate(booking);
    // No open trip (PENDING/DRAFT) on the same date → automatically create a new
    // bus for the booking's tour (bookingflow.md step 3) so the Dispatch Board
    // has data to work with.
    if (!candidate) {
      const bus = await this.createBusForBooking(booking);
      this.logger.log(
        `No open bus for booking ${booking.bookingRef} — created bus ${bus.code}`,
      );
      const result = await this.board.attach(bus.id, bookingId);
      if (!result.assigned) {
        return { skipped: true, reason: 'ASSIGN_FAILED' };
      }
      await this.auditService.log({
        entityType: 'Assignment',
        entityId: bus.id,
        action: 'AUTO_CREATE_BUS',
        afterData: {
          bookingId,
          bookingRef: booking.bookingRef,
          assignmentId: bus.id,
        },
        changedBy: null,
      });
      await this.assignCrew(bus.id);
      return {
        status: 'CREATED_BUS',
        bookingId,
        bookingRef: booking.bookingRef,
        assignmentId: bus.id,
      };
    }

    const result = await this.board.attach(candidate.id, bookingId);
    if (!result.assigned) {
      return { skipped: true, reason: 'ASSIGN_FAILED' };
    }

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: candidate.id,
      action: 'AUTO_ASSIGN',
      afterData: { bookingId, bookingRef: booking.bookingRef },
      changedBy: null,
    });

    this.logger.log(
      `Auto-assigned booking ${booking.bookingRef} -> bus ${candidate.code ?? candidate.id}`,
    );
    await this.assignCrew(candidate.id);
    return {
      status: 'ASSIGNED',
      bookingId,
      bookingRef: booking.bookingRef,
      assignmentId: candidate.id,
    };
  }

  /** Fill in the crew (guide + driver) still missing for the bus — auto-crew never overrides a manual assignment. */
  private async assignCrew(assignmentId: string) {
    try {
      const { assigned } = await this.autoCrew.assignCrewForBus(assignmentId);
      if (assigned) {
        this.logger.log(`Auto-assigned crew for bus ${assignmentId}`);
      }
    } catch (error) {
      this.logger.warn(
        `Auto-crew skipped for bus ${assignmentId}: ${(error as Error).message}`,
      );
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Create a bus (assignment) for a booking when no suitable open trip exists
   * (bookingflow.md: "if a booking's tour has none yet, create a placeholder object for the bus").
   * The new bus starts in PENDING status so the admin can assign the guide/driver
   * on the Dispatch Board.
   */
  private async createBusForBooking(booking: any) {
    // Use date-only from booking to avoid timezone issues
    const bookingDateKey = toDateKey(new Date(booking.startingDate));
    const startDate = new Date(bookingDateKey + 'T00:00:00.000Z');
    const durationDays = booking.tour?.durationDays ?? 1;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.max(1, durationDays - 1));
    const label = booking.tourType === TourType.PRIVATE_TOUR ? 'Priv' : 'Group';
    const existing = await this.prisma.assignment.findMany({
      where: { code: { startsWith: `${label} Bus -` } },
      select: { code: true },
    });
    const numbers = existing
      .map((a) => parseInt((a.code ?? '').split('-')[1]?.trim() ?? '0', 10))
      .filter((n) => !Number.isNaN(n));
    const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
    // Prefer a Company Fleet vehicle (if one is still free on the same dates) to
    // make use of company assets before hiring externally — company vehicles cost
    // 0 VND (priceOverride = 0).
    const companyVehicle = await this.findCompanyVehicle(
      booking,
      startDate,
      endDate,
    );
    return this.prisma.assignment.create({
      data: {
        code: `${label} Bus - ${nextNumber}`,
        startDate,
        endDate,
        status: AssignmentStatus.PENDING,
        origin: AssignmentOrigin.AUTO_ASSIGN,
        tourType: booking.tourType ?? null,
        tourName: booking.tourName ?? booking.tour?.name ?? undefined,
        durationDays,
        totalPax: booking.totalPax ?? 0,
        createdWho: 'Auto-Assign System',
        vehicleId: companyVehicle?.id ?? null,
        providerId: companyVehicle?.providerId ?? null,
        priceOverride: companyVehicle?.provider?.isCompany ? 0 : undefined,
      },
    });
  }

  /** Find a Company Fleet vehicle free during [startDate, endDate] with enough capacity. */
  private async findCompanyVehicle(booking: any, startDate: Date, endDate: Date) {
    const pax = booking.totalPax ?? 1;
    return this.prisma.vehicle.findFirst({
      where: {
        capacity: { gte: pax },
        provider: { isCompany: true },
        assignments: {
          none: {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
            status: {
              notIn: [AssignmentStatus.CANCELED, AssignmentStatus.COMPLETED],
            },
          },
        },
      },
      orderBy: [{ capacity: 'asc' }],
      select: { id: true, providerId: true, provider: { select: { isCompany: true } } },
    });
  }

  private async findCandidate(booking: any) {
    // Use tour name from booking.tour relation (already included in query)
    const bookingTourName = booking.tour?.name ?? booking.tourName;
    const bookingTourType = booking.tour?.type ?? booking.tourType;
    const bookingDateKey = toDateKey(new Date(booking.startingDate));
    const candidates = await this.prisma.assignment.findMany({
      where: {
        status: {
          in: [AssignmentStatus.DRAFT_ASSIGNED, AssignmentStatus.PENDING],
        },
        // Use date-only comparison to avoid timezone issues
        startDate: { lte: new Date(booking.startingDate) },
        endDate: { gte: new Date(booking.startingDate) },
      },
      include: {
        bookings: {
          include: { tour: { select: { name: true, type: true } } }
        },
        vehicle: {
          select: {
            id: true,
            capacity: true,
            provider: { select: { isCompany: true } },
          },
        },
      },
      orderBy: [{ startDate: 'asc' }],
    });

    const typeOk = (a: any) => {
      // Get tour name from assignment's first booking's tour relation
      const aTourName = a.tourName ?? a.bookings[0]?.tour?.name;
      const aTourType = a.tourType ?? a.bookings[0]?.tour?.type;
      
      // Must have same tourType
      if (bookingTourType && aTourType && aTourType !== bookingTourType) return false;
      // Must have same tourName (when both have it)
      if (bookingTourName && aTourName && aTourName !== bookingTourName) return false;
      // Must be same date (startDate)
      if (toDateKey(a.startDate) !== bookingDateKey) return false;
      return true;
    };
    const capOk = (a: any) => {
      const used = a.bookings.reduce(
        (sum: number, b: any) => sum + (b.totalPax ?? 0),
        0,
      );
      return (
        used + (booking.totalPax ?? 0) <=
        Math.min(a.vehicle?.capacity ?? BUS_MAX_PAX, BUS_MAX_PAX)
      );
    };

    const matches = candidates.filter((a) => typeOk(a) && capOk(a));
    if (matches.length === 0) return null;

    // Priority: exact tourName match > company fleet > most free seats
    matches.sort((a, b) => {
      const aTourName = a.tourName ?? a.bookings[0]?.tour?.name;
      const bTourName = b.tourName ?? b.bookings[0]?.tour?.name;
      // Exact tour name match priority (highest)
      const aExactName = aTourName === bookingTourName ? 0 : 1;
      const bExactName = bTourName === bookingTourName ? 0 : 1;
      if (aExactName !== bExactName) return aExactName - bExactName;
      // Company Fleet buses (company vehicles) second
      const aCompany = a.vehicle?.provider?.isCompany ? 0 : 1;
      const bCompany = b.vehicle?.provider?.isCompany ? 0 : 1;
      if (aCompany !== bCompany) return aCompany - bCompany;
      // Most free seats last
      return this.freeSeats(a) - this.freeSeats(b);
    });
    return matches[0];
  }

  private freeSeats(a: any): number {
    const cap = Math.min(a.vehicle?.capacity ?? BUS_MAX_PAX, BUS_MAX_PAX);
    const used = a.bookings.reduce(
      (sum: number, b: any) => sum + (b.totalPax ?? 0),
      0,
    );
    return cap - used;
  }
}