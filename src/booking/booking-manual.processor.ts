import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookingService } from './booking.service';
import { BOOKING_MANUAL_QUEUE } from '@/queues/queue.constants';

export interface BookingManualJob {
  data: Record<string, any>;
  actorId?: string;
}

/**
 * Dedicated queue for manually created bookings (dashboard/API), separate from
 * the mail flow. After creation they are still pushed to Assignment so trips
 * are grouped the same way as mail-originated bookings.
 */
@Injectable()
@Processor(BOOKING_MANUAL_QUEUE, { concurrency: 20 })
export class BookingManualProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingManualProcessor.name);

  constructor(private readonly bookingService: BookingService) {
    super();
  }

  async process(job: Job<BookingManualJob>) {
    const { data, actorId } = job.data;
    const booking = await this.bookingService.createManual(data, actorId);
    this.logger.log(`Created manual booking ${booking.bookingRef}`);
    return {
      created: true,
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
    };
  }
}
