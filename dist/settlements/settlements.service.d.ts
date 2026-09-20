import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { CreateSettlementCategoryDto, CreateSettlementDto, QuerySettlementDto, UpdateSettlementDto } from './dto/settlement.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
export declare class SettlementsService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    private include;
    listCategories(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        isSystem: boolean;
        flowType: import("@prisma/client").$Enums.FeeFlowType;
    }[]>;
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
    findAll(query: QuerySettlementDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
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
}
