import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ASSIGN_JOB, ASSIGN_QUEUE } from './queue.constants';

export interface AssignJobData {
  bookingId: string;
}

/**
 * Producer for the auto-assign queue (Stage 3 — booking → Assignment/bus).
 * The {bookingId} job is enqueued right after a booking is written successfully
 * (postWrite), but NOT for bookings that have been cancelled.
 */
@Injectable()
export class AssignmentQueue {
  private readonly logger = new Logger(AssignmentQueue.name);

  constructor(
    @InjectQueue(ASSIGN_QUEUE) private readonly queue: Queue<AssignJobData>,
  ) {}

  async enqueue(bookingId: string) {
    try {
      await this.queue.add(
        ASSIGN_JOB,
        { bookingId },
        {
          jobId: `assign-${bookingId}`,
          removeOnComplete: true,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
      return { enqueued: true, bookingId };
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (
        err?.name === 'JobNotUniqueError' ||
        /duplicate|already exists/i.test(err?.message ?? '')
      ) {
        // A job already exists for this booking — avoid enqueueing a duplicate.
        return { enqueued: false, bookingId, reason: 'ALREADY_QUEUED' };
      }
      this.logger.warn(`Enqueue assign ${bookingId} failed: ${err?.message}`);
      return { enqueued: false, bookingId, reason: err?.message };
    }
  }
}