import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AssignmentStatus, BookingStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { ASSIGNMENT_QUEUE } from './queue.constants';

export interface AssignmentJob {
  bookingId: string;
}

const DEFAULT_CAPACITY = 29;

@Injectable()
@Processor(ASSIGNMENT_QUEUE, { concurrency: 50 })
export class AssignmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AssignmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<AssignmentJob>) {
    const { bookingId } = job.data;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tour: true },
    });
    if (!booking) return { skipped: true, reason: 'BOOKING_NOT_FOUND' };
    if (booking.assignmentId) return { skipped: true, reason: 'ALREADY_ASSIGNED' };
    if (booking.status === BookingStatus.CANCELED) return { skipped: true, reason: 'CANCELED' };
    if (!booking.startingDate) return { skipped: true, reason: 'NO_START_DATE' };

    const start = booking.startingDate;
    const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const candidates = await this.prisma.assignment.findMany({
      where: {
        status: { in: [AssignmentStatus.PENDING, AssignmentStatus.DISPATCHED] },
        startDate: { gte: dayStart, lt: dayEnd },
      },
      include: {
        bookings: { select: { totalPax: true } },
        vehicle: { select: { capacity: true } },
      },
      orderBy: [{ sequenceIndex: 'asc' }, { startDate: 'asc' }],
      take: 10,
    });

    let assignmentId: string | null = null;
    for (const candidate of candidates) {
      const used = candidate.bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
      const capacity = candidate.vehicle?.capacity ?? DEFAULT_CAPACITY;
      if ((booking.totalPax ?? 0) + used <= capacity) {
        assignmentId = candidate.id;
        break;
      }
    }

    if (!assignmentId) {
      const assignment = await this.prisma.assignment.create({
        data: {
          code: `${booking.tourName ?? 'Tour'}`,
          startDate: dayStart,
          endDate: dayEnd,
          status: AssignmentStatus.PENDING,
        },
      });
      assignmentId = assignment.id;
      await this.auditService.log({
        entityType: 'Assignment',
        entityId: assignment.id,
        action: 'AUTO_CREATE',
        afterData: { fromBookingId: booking.id },
      });
    }

    const maxSeq = await this.prisma.booking.aggregate({
      where: { assignmentId },
      _max: { paxSequence: true },
    });

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        assignmentId,
        paxSequence: (maxSeq._max.paxSequence ?? 0) + 1,
        status: BookingStatus.ASSIGNED,
      },
    });

    await this.auditService.log({
      entityType: 'Booking',
      entityId: booking.id,
      action: 'AUTO_ASSIGN',
      afterData: { assignmentId, paxSequence: updated.paxSequence },
    });

    this.logger.log(`Assigned booking ${booking.bookingRef} -> assignment ${assignmentId}`);
    return { assigned: true, assignmentId, paxSequence: updated.paxSequence };
  }
}
