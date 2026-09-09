import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AssignmentStatus, BookingStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { AssignmentBoardService } from './assignment-board.service';
import { ASSIGN_QUEUE } from './queue.constants';
import { AssignJobData } from './assignment.queue';

/** Một chuyến xe (bus) chở tối đa 12 khách — theo bookingflow.md. */
const BUS_MAX_PAX = 12;

/**
 * BullMQ worker Stage 3: booking → Assignment.
 * Tìm 1 chuyến xe đang MỞ (DRAFT_ASSIGNED/PENDING) cùng ngày, cùng tourType,
 * còn sức chứa → attach booking (status => ASSIGNED) + refresh summary.
 * Không tìm được bus → booking giữ PENDING để admin xếp tay trên Dispatch Board.
 */
@Injectable()
@Processor(ASSIGN_QUEUE, { concurrency: 5 })
export class AssignmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AssignmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly board: AssignmentBoardService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<AssignJobData>) {
    const { bookingId } = job.data;
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
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
    if (!candidate) {
      this.logger.log(
        `No open bus for booking ${booking.bookingRef} — stays PENDING for manual assignment`,
      );
      return {
        status: 'NO_BUS_FOUND',
        bookingId,
        bookingRef: booking.bookingRef,
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
    return {
      status: 'ASSIGNED',
      bookingId,
      bookingRef: booking.bookingRef,
      assignmentId: candidate.id,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private async findCandidate(booking: any) {
    const candidates = await this.prisma.assignment.findMany({
      where: {
        status: {
          in: [AssignmentStatus.DRAFT_ASSIGNED, AssignmentStatus.PENDING],
        },
        startDate: { lte: booking.startingDate },
        endDate: { gte: booking.startingDate },
      },
      include: { bookings: true, vehicle: true },
      orderBy: [{ startDate: 'asc' }],
    });

    const typeOk = (a: any) =>
      booking.tourType == null ||
      a.tourType == null ||
      a.tourType === booking.tourType;
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

    // Ưu tiên bus đúng tourType nhất, rồi bus còn ít chỗ nhất (fit chặt).
    matches.sort((a, b) => {
      const aExact = a.tourType === booking.tourType ? 0 : 1;
      const bExact = b.tourType === booking.tourType ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
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