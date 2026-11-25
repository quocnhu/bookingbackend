import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AssignmentBoardService } from "../queues/assignment-board.service";
import { DispatchPolicyService } from "../dispatch-policy/dispatch-policy.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PaymentService } from './payment.service';
export interface UnpaidCleanupResult {
    scanned: number;
    cancelled: number;
    paid: number;
    skipped: number;
}
export declare class UnpaidBookingCleanupService {
    private readonly prisma;
    private readonly payments;
    private readonly audit;
    private readonly board;
    private readonly dispatchPolicy;
    private readonly gateway;
    private readonly logger;
    private running;
    constructor(prisma: PrismaService, payments: PaymentService, audit: AuditService, board: AssignmentBoardService, dispatchPolicy: DispatchPolicyService, gateway: NotificationsGateway);
    scheduledTick(): Promise<void>;
    runCleanup(now?: Date): Promise<UnpaidCleanupResult>;
    private cancelUnpaidBooking;
}
