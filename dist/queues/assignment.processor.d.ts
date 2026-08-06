import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
export interface AssignmentJob {
    bookingId: string;
}
export declare class AssignmentProcessor extends WorkerHost {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    process(job: Job<AssignmentJob>): Promise<{
        skipped: boolean;
        reason: string;
        assigned?: undefined;
        assignmentId?: undefined;
        paxSequence?: undefined;
    } | {
        assigned: boolean;
        assignmentId: string;
        paxSequence: number;
        skipped?: undefined;
        reason?: undefined;
    }>;
}
