import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookingWriterService } from './booking-writer.service';
export interface BookingIngestJob {
    rawDataId: string;
}
export declare class BookingIngestProcessor extends WorkerHost {
    private readonly writer;
    private readonly logger;
    constructor(writer: BookingWriterService);
    process(job: Job<BookingIngestJob>): Promise<import("./booking-writer.service").WriteResult>;
}
