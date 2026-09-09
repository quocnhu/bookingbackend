import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AssignmentBoardService } from './assignment-board.service';
import { AssignJobData } from './assignment.queue';
export declare class AssignmentProcessor extends WorkerHost {
    private readonly prisma;
    private readonly board;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, board: AssignmentBoardService, auditService: AuditService);
    process(job: Job<AssignJobData>): Promise<{
        skipped: boolean;
        reason: string;
        assignmentId?: undefined;
        status?: undefined;
        bookingId?: undefined;
        bookingRef?: undefined;
    } | {
        skipped: boolean;
        reason: string;
        assignmentId: string;
        status?: undefined;
        bookingId?: undefined;
        bookingRef?: undefined;
    } | {
        status: string;
        bookingId: string;
        bookingRef: string;
        skipped?: undefined;
        reason?: undefined;
        assignmentId?: undefined;
    } | {
        status: string;
        bookingId: string;
        bookingRef: string;
        assignmentId: string;
        skipped?: undefined;
        reason?: undefined;
    }>;
    private findCandidate;
    private freeSeats;
}
