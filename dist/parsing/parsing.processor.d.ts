import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RawDataRepository } from '@/raw-data/raw-data.repository';
import { RawDataService } from '@/raw-data/raw-data.service';
import { BookingService } from '@/booking/booking.service';
import { ParserRegistry } from './parsers/parser-registry';
import { ParseJobData } from './parsing.queue';
export declare class ParsingProcessor extends WorkerHost {
    private readonly rawDataRepo;
    private readonly rawDataService;
    private readonly registry;
    private readonly bookingService;
    private readonly logger;
    constructor(rawDataRepo: RawDataRepository, rawDataService: RawDataService, registry: ParserRegistry, bookingService: BookingService);
    process(job: Job<ParseJobData>): Promise<{
        skipped: boolean;
        reason: string;
        status?: undefined;
        rawDataId?: undefined;
        bookingId?: undefined;
    } | {
        status: string;
        rawDataId: string;
        skipped?: undefined;
        reason?: undefined;
        bookingId?: undefined;
    } | {
        status: string;
        reason: string;
        skipped?: undefined;
        rawDataId?: undefined;
        bookingId?: undefined;
    } | {
        status: string;
        bookingId: string;
        skipped?: undefined;
        reason?: undefined;
        rawDataId?: undefined;
    }>;
}
