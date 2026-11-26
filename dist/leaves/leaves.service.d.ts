import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { CreateLeaveDto, QueryLeaveDto, QueryTimesheetDto, UpdateLeaveStatusDto } from './dto/leave.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { DispatchPolicyService } from "../dispatch-policy/dispatch-policy.service";
export declare class LeavesService {
    private readonly prisma;
    private readonly auditService;
    private readonly notificationService;
    private readonly gateway;
    private readonly dispatchPolicy;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, notificationService: NotificationService, gateway: NotificationsGateway, dispatchPolicy: DispatchPolicyService);
    private includeUser;
    private normalizeRange;
    private assertRequestTiming;
    hasLeaveConflict(userId: string, start: Date, end: Date, excludeId?: string): Promise<boolean>;
    create(dto: CreateLeaveDto, actor: AuthenticatedUser): Promise<{
        user: {
            role: import("@prisma/client").$Enums.RoleType;
            name: string | null;
            id: string;
            email: string;
        };
        reviewedBy: {
            role: import("@prisma/client").$Enums.RoleType;
            name: string | null;
            id: string;
            email: string;
        } | null;
    } & {
        updatedAt: Date;
        id: string;
        createdAt: Date;
        userId: string;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.LeaveStatus;
        reason: string | null;
        isEmergency: boolean;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    findAll(query: QueryLeaveDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
    findMy(actor: AuthenticatedUser): Promise<{
        id: any;
        requesterName: any;
        requesterRole: any;
        startDate: any;
        endDate: any;
        reason: any;
        isEmergency: any;
        status: any;
        reviewedByName: any;
        reviewedByRole: any;
        reviewedAt: any;
        createdAt: any;
        updatedAt: any;
        userId: any;
    }[]>;
    findMySummary(actor: AuthenticatedUser): Promise<{
        week: {
            start: string;
            end: string;
            days: number;
            approvedDays: number;
            pendingDays: number;
            requests: number;
        };
        month: {
            start: string;
            end: string;
            days: number;
            approvedDays: number;
            pendingDays: number;
            requests: number;
        };
        year: {
            start: string;
            end: string;
            days: number;
            approvedDays: number;
            pendingDays: number;
            requests: number;
        };
    }>;
    updateStatus(id: string, dto: UpdateLeaveStatusDto, actor: AuthenticatedUser): Promise<{
        user: {
            role: import("@prisma/client").$Enums.RoleType;
            name: string | null;
            id: string;
            email: string;
        };
        reviewedBy: {
            role: import("@prisma/client").$Enums.RoleType;
            name: string | null;
            id: string;
            email: string;
        } | null;
    } & {
        updatedAt: Date;
        id: string;
        createdAt: Date;
        userId: string;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.LeaveStatus;
        reason: string | null;
        isEmergency: boolean;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    remove(id: string, actor: AuthenticatedUser): Promise<{
        message: string;
    }>;
    private readonly employeeSelect;
    private readonly roleOrder;
    private assertLeaveManager;
    private resolveEmployeeGroup;
    private toEmployee;
    listEmployees(actor: AuthenticatedUser): Promise<{
        id: any;
        name: any;
        email: any;
        role: any;
        isActive: any;
        provider: {
            id: any;
            name: any;
            isCompany: any;
        } | null;
        group: "ADMIN" | "OFFICE" | "TOURIST" | "COMPANY_GUIDE" | "FREELANCE_GUIDE" | "COMPANY_DRIVER" | "FREELANCE_DRIVER" | "PROVIDER_STAFF" | "PROVIDER_ACCOUNT";
        guideType: any;
        driverType: any;
        rating: any;
    }[]>;
    getTimesheet(query: QueryTimesheetDto, actor: AuthenticatedUser): Promise<{
        from: string;
        to: string;
        employees: {
            leaves: any[];
            assignments: any[];
            id: any;
            name: any;
            email: any;
            role: any;
            isActive: any;
            provider: {
                id: any;
                name: any;
                isCompany: any;
            } | null;
            group: "ADMIN" | "OFFICE" | "TOURIST" | "COMPANY_GUIDE" | "FREELANCE_GUIDE" | "COMPANY_DRIVER" | "FREELANCE_DRIVER" | "PROVIDER_STAFF" | "PROVIDER_ACCOUNT";
            guideType: any;
            driverType: any;
            rating: any;
        }[];
    }>;
    private inclusiveDays;
    private summarizePeriod;
    private formatRange;
    private flatten;
    private notifyReviewersOfRequest;
}
