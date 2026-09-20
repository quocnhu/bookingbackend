import { LeavesService } from './leaves.service';
import { CreateLeaveDto, QueryLeaveDto, UpdateLeaveStatusDto } from './dto/leave.dto';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
export declare class LeavesController {
    private readonly leavesService;
    constructor(leavesService: LeavesService);
    findAll(query: QueryLeaveDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
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
}
