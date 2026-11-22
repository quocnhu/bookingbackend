import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { DispatchPolicyService } from "../dispatch-policy/dispatch-policy.service";
export declare class AssignmentBoardService {
    private readonly prisma;
    private readonly auditService;
    private readonly dispatchPolicy;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, dispatchPolicy: DispatchPolicyService);
    unassign(bookingId: string): Promise<{
        skipped: boolean;
        unassigned?: undefined;
        assignmentId?: undefined;
    } | {
        unassigned: boolean;
        assignmentId: string;
        skipped?: undefined;
    }>;
    cleanupAssignmentIfEmpty(assignmentId: string): Promise<boolean>;
    reorder(assignmentId: string, bookingIds: string[]): Promise<{
        error: string;
        reordered?: undefined;
    } | {
        reordered: boolean;
        error?: undefined;
    }>;
    move(fromAssignmentId: string, bookingId: string, toAssignmentId: string): Promise<{
        error: string;
        moved?: undefined;
        toAssignmentId?: undefined;
    } | {
        moved: boolean;
        toAssignmentId: string;
        error?: undefined;
    }>;
    attachToWaitingList(bookingId: string): Promise<{
        error: "BOOKING_NOT_FOUND";
        assignmentId?: undefined;
        waitingList?: undefined;
        created?: undefined;
    } | {
        error: "ALREADY_ASSIGNED";
        assignmentId: string;
        waitingList?: undefined;
        created?: undefined;
    } | {
        error: "NO_START_DATE";
        assignmentId?: undefined;
        waitingList?: undefined;
        created?: undefined;
    } | {
        waitingList: true;
        assignmentId: string;
        created: boolean;
        error?: undefined;
    }>;
    attach(assignmentId: string, bookingId: string): Promise<{
        assigned: boolean;
        assignmentId?: string;
    }>;
    private attachBooking;
    private canFit;
    private refreshSummary;
    syncDatesFromBookings(assignmentId: string): Promise<{
        skipped: boolean;
        synced?: undefined;
        startDate?: undefined;
        endDate?: undefined;
    } | {
        synced: boolean;
        startDate: Date;
        endDate: Date;
        skipped?: undefined;
    }>;
    private resequence;
    geoSort(assignmentId: string): Promise<void>;
}
