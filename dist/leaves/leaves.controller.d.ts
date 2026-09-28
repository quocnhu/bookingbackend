import { LeavesService } from './leaves.service';
import { CreateLeaveDto, QueryLeaveDto, UpdateLeaveStatusDto } from './dto/leave.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class LeavesController {
    private readonly leavesService;
    constructor(leavesService: LeavesService);
    findAll(query: QueryLeaveDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findMy(actor: AuthenticatedUser): Promise<({
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
        status: import("@prisma/client").$Enums.LeaveStatus;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
    })[]>;
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
        status: import("@prisma/client").$Enums.LeaveStatus;
        startDate: Date;
        endDate: Date;
        reason: string | null;
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
        status: import("@prisma/client").$Enums.LeaveStatus;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    remove(id: string, actor: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
