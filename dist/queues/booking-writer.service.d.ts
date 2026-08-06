import { Queue } from 'bullmq';
import { Booking } from '@prisma/client';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { BookingNormalizerService, CleanBookingData } from './booking-normalizer.service';
export type WriteResult = {
    status: 'SKIPPED';
    reason: string;
    booking?: undefined;
} | {
    status: 'PROCESSED';
    booking?: Booking | null;
};
export declare class BookingWriterService {
    private readonly prisma;
    private readonly auditService;
    private readonly normalizer;
    private readonly assignmentQueue;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, normalizer: BookingNormalizerService, assignmentQueue: Queue);
    writeFromRawData(rawDataId: string): Promise<WriteResult>;
    createManual(data: Record<string, any>, actorId?: string): Promise<Booking>;
    upsertBooking(data: CleanBookingData, rawDataId?: string, actorId?: string): Promise<Booking>;
    private enqueueAssignment;
}
