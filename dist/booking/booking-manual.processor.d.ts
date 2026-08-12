import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookingService } from './booking.service';
export interface BookingManualJob {
    data: Record<string, any>;
    actorId?: string;
}
export declare class BookingManualProcessor extends WorkerHost {
    private readonly bookingService;
    private readonly logger;
    constructor(bookingService: BookingService);
    process(job: Job<BookingManualJob>): Promise<{
        created: boolean;
        bookingId: string;
        bookingRef: string;
    }>;
}
