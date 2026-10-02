import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AssignmentBoardService } from './assignment-board.service';
import { AutoCrewService } from './auto-crew.service';
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { AssignJobData } from './assignment.queue';
export declare class AssignmentProcessor extends WorkerHost {
    private readonly prisma;
    private readonly board;
    private readonly auditService;
    private readonly autoCrew;
    private readonly gateway;
    private readonly logger;
    constructor(prisma: PrismaService, board: AssignmentBoardService, auditService: AuditService, autoCrew: AutoCrewService, gateway: NotificationsGateway);
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
        assignmentId: string;
        skipped?: undefined;
        reason?: undefined;
    }>;
    private assignCrew;
    private createBusForBooking;
    private findCompanyVehicle;
    private findCandidate;
    private freeSeats;
}
