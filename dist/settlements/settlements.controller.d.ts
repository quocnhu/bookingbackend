import { SettlementsService } from './settlements.service';
import { CreateSettlementCategoryDto, CreateSettlementDto, QuerySettlementDto, UpdateSettlementDto } from './dto/settlement.dto';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
export declare class SettlementsController {
    private readonly settlementsService;
    constructor(settlementsService: SettlementsService);
    listCategories(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        isSystem: boolean;
        flowType: import("@prisma/client").$Enums.FeeFlowType;
    }[]>;
    exportByProvider(providerId: string, startDate?: string, endDate?: string): Promise<{
        provider: {
            id: string;
            name: string;
        } | null;
        period: {
            startDate: string | undefined;
            endDate: string | undefined;
        };
        drivers: any[];
        totalAmount: number;
    }>;
    createCategory(dto: CreateSettlementCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        isSystem: boolean;
        flowType: import("@prisma/client").$Enums.FeeFlowType;
    }>;
    removeCategory(id: string): Promise<{
        message: string;
    }>;
    findAll(query: QuerySettlementDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findOne(id: string): Promise<{
        assignment: {
            id: string;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            tourName: string | null;
            code: string | null;
        } | null;
        booking: {
            id: string;
            bookingRef: string;
            customerName: string | null;
            totalPax: number;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
        } | null;
        category: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            isSystem: boolean;
            flowType: import("@prisma/client").$Enums.FeeFlowType;
        } | null;
        createdBy: {
            id: string;
            name: string | null;
            email: string;
        };
    } & {
        id: string;
        assignmentId: string | null;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string | null;
        bookingId: string | null;
        categoryId: string | null;
        amount: number;
        note: string | null;
        customCategoryName: string | null;
        createdById: string;
    }>;
    create(dto: CreateSettlementDto, actor: AuthenticatedUser): Promise<{
        assignment: {
            id: string;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            tourName: string | null;
            code: string | null;
        } | null;
        booking: {
            id: string;
            bookingRef: string;
            customerName: string | null;
            totalPax: number;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
        } | null;
        category: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            isSystem: boolean;
            flowType: import("@prisma/client").$Enums.FeeFlowType;
        } | null;
        createdBy: {
            id: string;
            name: string | null;
            email: string;
        };
    } & {
        id: string;
        assignmentId: string | null;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string | null;
        bookingId: string | null;
        categoryId: string | null;
        amount: number;
        note: string | null;
        customCategoryName: string | null;
        createdById: string;
    }>;
    update(id: string, dto: UpdateSettlementDto): Promise<{
        assignment: {
            id: string;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            tourName: string | null;
            code: string | null;
        } | null;
        booking: {
            id: string;
            bookingRef: string;
            customerName: string | null;
            totalPax: number;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
        } | null;
        category: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            isSystem: boolean;
            flowType: import("@prisma/client").$Enums.FeeFlowType;
        } | null;
        createdBy: {
            id: string;
            name: string | null;
            email: string;
        };
    } & {
        id: string;
        assignmentId: string | null;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string | null;
        bookingId: string | null;
        categoryId: string | null;
        amount: number;
        note: string | null;
        customCategoryName: string | null;
        createdById: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
