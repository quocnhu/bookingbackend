import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookingWriterService } from './booking-writer.service';
import { BOOKING_INGEST_QUEUE } from './queue.constants';

export interface BookingIngestJob {
  rawDataId: string;
}

/**
 * Flow mail: RawData -> JSON sạch -> Booking -> Assignment (tự động).
 */
@Injectable()
@Processor(BOOKING_INGEST_QUEUE, { concurrency: 25 })
export class BookingIngestProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingIngestProcessor.name);

  constructor(private readonly writer: BookingWriterService) {
    super();
  }

  async process(job: Job<BookingIngestJob>) {
    const { rawDataId } = job.data;
    const result = await this.writer.writeFromRawData(rawDataId);
    this.logger.log(
      `Ingested rawData ${rawDataId} -> ${result.status}${result.booking ? ` booking=${result.booking.bookingRef}` : ''}`,
    );
    return result;
  }
}
