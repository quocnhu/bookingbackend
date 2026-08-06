import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookingWriterService } from './booking-writer.service';
export interface BookingManualJob {
    data: Record<string, any>;
    actorId?: string;
}
export declare class BookingManualProcessor extends WorkerHost {
    private readonly writer;
    private readonly logger;
    constructor(writer: BookingWriterService);
    process(job: Job<BookingManualJob>): Promise<{
        created: boolean;
        bookingId: string;
        bookingRef: string;
    }>;
}
