import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
export declare class AssignmentBoardService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    unassign(bookingId: string): Promise<{
        skipped: boolean;
        unassigned?: undefined;
        assignmentId?: undefined;
    } | {
        unassigned: boolean;
        assignmentId: string;
        skipped?: undefined;
    }>;
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
    attach(assignmentId: string, bookingId: string): Promise<{
        assigned: boolean;
        assignmentId?: string;
    }>;
    private attachBooking;
    private canFit;
    private refreshSummary;
    private resequence;
    geoSort(assignmentId: string): Promise<void>;
}
