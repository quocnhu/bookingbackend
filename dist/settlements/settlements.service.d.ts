import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateSettlementDto, QuerySettlementDto, UpdateSettlementDto } from './dto/settlement.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
import { SettlementStatus } from '@prisma/client';
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class SettlementsService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    private include;
    findAll(query: QuerySettlementDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
    findOne(id: string): Promise<{
        user: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        assignment: {
            id: string;
            createdAt: Date;
            providerId: string | null;
            updatedAt: Date;
            code: string | null;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            guideId: string | null;
            driverId: string | null;
            startDate: Date;
            endDate: Date;
            sequenceIndex: number;
            priceOverride: import("@prisma/client/runtime/library").Decimal | null;
            tripNotes: string | null;
            vehicleId: string | null;
        };
        provider: {
            id: string;
            name: string;
        } | null;
        expenseItems: {
            id: string;
            description: string | null;
            category: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            receiptUrl: string | null;
            settlementId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        providerId: string | null;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SettlementStatus;
        assignmentId: string;
        payeeType: import("@prisma/client").$Enums.PayeeType;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        allowance: import("@prisma/client/runtime/library").Decimal;
        deduction: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        periodName: string | null;
        notes: string | null;
    }>;
    create(dto: CreateSettlementDto): Promise<{
        user: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        assignment: {
            id: string;
            createdAt: Date;
            providerId: string | null;
            updatedAt: Date;
            code: string | null;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            guideId: string | null;
            driverId: string | null;
            startDate: Date;
            endDate: Date;
            sequenceIndex: number;
            priceOverride: import("@prisma/client/runtime/library").Decimal | null;
            tripNotes: string | null;
            vehicleId: string | null;
        };
        provider: {
            id: string;
            name: string;
        } | null;
        expenseItems: {
            id: string;
            description: string | null;
            category: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            receiptUrl: string | null;
            settlementId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        providerId: string | null;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SettlementStatus;
        assignmentId: string;
        payeeType: import("@prisma/client").$Enums.PayeeType;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        allowance: import("@prisma/client/runtime/library").Decimal;
        deduction: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        periodName: string | null;
        notes: string | null;
    }>;
    update(id: string, dto: UpdateSettlementDto): Promise<{
        user: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        assignment: {
            id: string;
            createdAt: Date;
            providerId: string | null;
            updatedAt: Date;
            code: string | null;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            guideId: string | null;
            driverId: string | null;
            startDate: Date;
            endDate: Date;
            sequenceIndex: number;
            priceOverride: import("@prisma/client/runtime/library").Decimal | null;
            tripNotes: string | null;
            vehicleId: string | null;
        };
        provider: {
            id: string;
            name: string;
        } | null;
        expenseItems: {
            id: string;
            description: string | null;
            category: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            receiptUrl: string | null;
            settlementId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        providerId: string | null;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SettlementStatus;
        assignmentId: string;
        payeeType: import("@prisma/client").$Enums.PayeeType;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        allowance: import("@prisma/client/runtime/library").Decimal;
        deduction: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        periodName: string | null;
        notes: string | null;
    }>;
    updateStatus(id: string, status: SettlementStatus): Promise<{
        user: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        assignment: {
            id: string;
            createdAt: Date;
            providerId: string | null;
            updatedAt: Date;
            code: string | null;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            guideId: string | null;
            driverId: string | null;
            startDate: Date;
            endDate: Date;
            sequenceIndex: number;
            priceOverride: import("@prisma/client/runtime/library").Decimal | null;
            tripNotes: string | null;
            vehicleId: string | null;
        };
        provider: {
            id: string;
            name: string;
        } | null;
        expenseItems: {
            id: string;
            description: string | null;
            category: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            receiptUrl: string | null;
            settlementId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        providerId: string | null;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SettlementStatus;
        assignmentId: string;
        payeeType: import("@prisma/client").$Enums.PayeeType;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        allowance: import("@prisma/client/runtime/library").Decimal;
        deduction: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        periodName: string | null;
        notes: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
