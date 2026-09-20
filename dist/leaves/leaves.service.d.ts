import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { CreateLeaveDto, QueryLeaveDto, UpdateLeaveStatusDto } from './dto/leave.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
export declare class LeavesService {
    private readonly prisma;
    private readonly auditService;
    private readonly notificationService;
    private readonly gateway;
    constructor(prisma: PrismaService, auditService: AuditService, notificationService: NotificationService, gateway: NotificationsGateway);
    private includeUser;
    private normalizeRange;
    hasLeaveConflict(userId: string, start: Date, end: Date, excludeId?: string): Promise<boolean>;
    create(dto: CreateLeaveDto, actor: AuthenticatedUser): Promise<{
        user: {
            id: string;
            name: string | null;
            email: string;
            role: import("@prisma/client").$Enums.RoleType;
        };
        reviewedBy: {
            id: string;
            name: string | null;
            email: string;
            role: import("@prisma/client").$Enums.RoleType;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        userId: string;
        reason: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    findAll(query: QueryLeaveDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
    findMy(actor: AuthenticatedUser): Promise<({
        user: {
            id: string;
            name: string | null;
            email: string;
            role: import("@prisma/client").$Enums.RoleType;
        };
        reviewedBy: {
            id: string;
            name: string | null;
            email: string;
            role: import("@prisma/client").$Enums.RoleType;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        userId: string;
        reason: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
    })[]>;
    updateStatus(id: string, dto: UpdateLeaveStatusDto, actor: AuthenticatedUser): Promise<{
        user: {
            id: string;
            name: string | null;
            email: string;
            role: import("@prisma/client").$Enums.RoleType;
        };
        reviewedBy: {
            id: string;
            name: string | null;
            email: string;
            role: import("@prisma/client").$Enums.RoleType;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        userId: string;
        reason: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    remove(id: string, actor: AuthenticatedUser): Promise<{
        message: string;
    }>;
    private formatRange;
    private flatten;
    private notifyAdminsOfRequest;
}
