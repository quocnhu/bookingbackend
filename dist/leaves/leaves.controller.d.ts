import { LeavesService } from './leaves.service';
import { CreateLeaveDto, QueryLeaveDto, UpdateLeaveStatusDto } from './dto/leave.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class LeavesController {
    private readonly leavesService;
    constructor(leavesService: LeavesService);
    findAll(query: QueryLeaveDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
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
    create(dto: CreateLeaveDto, actor: AuthenticatedUser): Promise<{
        user: {
            role: import("@prisma/client").$Enums.RoleType;
            id: string;
            name: string | null;
            email: string;
        };
        reviewedBy: {
            role: import("@prisma/client").$Enums.RoleType;
            id: string;
            name: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.LeaveStatus;
        reason: string | null;
        isEmergency: boolean;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    updateStatus(id: string, dto: UpdateLeaveStatusDto, actor: AuthenticatedUser): Promise<{
        user: {
            role: import("@prisma/client").$Enums.RoleType;
            id: string;
            name: string | null;
            email: string;
        };
        reviewedBy: {
            role: import("@prisma/client").$Enums.RoleType;
            id: string;
            name: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        updatedAt: Date;
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
}
