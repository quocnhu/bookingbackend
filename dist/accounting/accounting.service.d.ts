import { PayeeType, Prisma, RoleType } from '@prisma/client';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateSettlementCategoryDto, CreateSettlementDto, ExportPeriodDto, ListPeopleQueryDto, PeriodQueryDto, RejectMoneyDto, VerifyTourMoneyDto, VoidPeriodDto } from './dto/accounting.dto';
export declare const PAYEE_LABELS: Record<PayeeType, string>;
export interface Payee {
    id: string;
    kind: 'PERSON' | 'PROVIDER';
    name: string;
    email: string | null;
    role: RoleType;
    userType: string | null;
    providerName: string | null;
    providerIsCompany: boolean | null;
    payeeType: PayeeType;
}
export declare class AccountingService {
    private readonly prisma;
    private readonly audit;
    private readonly notificationService;
    private readonly gateway;
    constructor(prisma: PrismaService, audit: AuditService, notificationService: NotificationService, gateway: NotificationsGateway);
    private assertAccounting;
    private assertPayable;
    private range;
    listCategories(actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        isSystem: boolean;
        code: string;
        flowType: import("@prisma/client").$Enums.FeeFlowType;
    }[]>;
    createCategory(actor: AuthenticatedUser, dto: CreateSettlementCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        isSystem: boolean;
        code: string;
        flowType: import("@prisma/client").$Enums.FeeFlowType;
    }>;
    private assertTourMutable;
    private assertOwnTour;
    tourMoney(actor: AuthenticatedUser, assignmentId: string): Promise<{
        locked: boolean;
        lockedBy: string | null;
        returnedForRecheck: boolean;
        collected: number;
        paid: number;
        net: number;
        flow: "COLLECT_MONEY" | "PAY_MONEY";
        entryCount: number;
        rows: ({
            booking: {
                id: string;
                bookingRef: string;
                customerName: string | null;
                totalPax: number;
            } | null;
            category: {
                id: string;
                name: string;
                code: string;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            assignmentId: string | null;
            bookingId: string | null;
            note: string | null;
            amount: Prisma.Decimal;
            categoryId: string | null;
            createdById: string;
            createdByName: string | null;
            reversesId: string | null;
        })[];
        categories: {
            id: string;
            name: string;
            code: string;
            flowType: import("@prisma/client").$Enums.FeeFlowType;
        }[];
    }>;
    addTourMoney(actor: AuthenticatedUser, assignmentId: string, dto: CreateSettlementDto): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            isSystem: boolean;
            code: string;
            flowType: import("@prisma/client").$Enums.FeeFlowType;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        amount: Prisma.Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    }>;
    listSettlements(actor: AuthenticatedUser, assignmentId: string): Promise<({
        booking: {
            bookingRef: string;
            customerName: string | null;
        } | null;
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            isSystem: boolean;
            code: string;
            flowType: import("@prisma/client").$Enums.FeeFlowType;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        amount: Prisma.Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    })[]>;
    createSettlement(actor: AuthenticatedUser, assignmentId: string, dto: CreateSettlementDto): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            isSystem: boolean;
            code: string;
            flowType: import("@prisma/client").$Enums.FeeFlowType;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        amount: Prisma.Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    }>;
    private createSettlementCore;
    updateSettlement(actor: AuthenticatedUser, id: string, dto: {
        amount?: number;
        note?: string;
        categoryId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        amount: Prisma.Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    }>;
    reverseTourMoney(actor: AuthenticatedUser, assignmentId: string, settlementId: string, dto: {
        note?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        amount: Prisma.Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    }>;
    reverseSettlement(actor: AuthenticatedUser, id: string, dto: {
        note: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        amount: Prisma.Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    }>;
    private reverseSettlementCore;
    private sumRows;
    private computeNet;
    private resolveDefaultPayee;
    verificationQueue(actor: AuthenticatedUser): Promise<{
        waitingDays: number;
        collected: number;
        paid: number;
        net: number;
        flow: "COLLECT_MONEY" | "PAY_MONEY";
        entryCount: number;
        assignmentId: string;
        code: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        finalizedAt: Date | null;
        reportStatus: import("@prisma/client").$Enums.TourReportStatus | null;
        guide: {
            id: string;
            name: string | null;
        } | null;
        driver: {
            id: string;
            name: string | null;
        } | null;
        plateNumber: string | undefined;
        suggestedPayableTo: {
            basis: "ASSIGNMENT_GUIDE";
            id: string;
            name: string | null;
        } | null;
    }[]>;
    verifyTourMoney(actor: AuthenticatedUser, assignmentId: string, dto: VerifyTourMoneyDto): Promise<{
        net: {
            collected: number;
            paid: number;
            net: number;
            flow: "COLLECT_MONEY" | "PAY_MONEY";
            entryCount: number;
        };
        payableToId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TourReportStatus;
        notes: string | null;
        assignmentId: string;
        submittedById: string | null;
        submittedByName: string | null;
        submittedAt: Date;
        actualPax: number | null;
        pickupNotes: string | null;
        distanceKm: number | null;
        fuelCost: Prisma.Decimal | null;
        tollParking: Prisma.Decimal | null;
        verifiedById: string | null;
        verifiedByName: string | null;
        verifiedAt: Date | null;
        verificationNotes: string | null;
        finalizedById: string | null;
        finalizedByName: string | null;
        finalizedAt: Date | null;
        settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
        netAmount: Prisma.Decimal | null;
        moneyVerifiedById: string | null;
        moneyVerifiedByName: string | null;
        moneyVerifiedAt: Date | null;
        moneyVerificationNote: string | null;
        moneyPayableToId: string | null;
        moneyRejectedAt: Date | null;
        moneyRejectedById: string | null;
        moneyRejectedByName: string | null;
        moneyRejectionReason: string | null;
        evidenceImages: Prisma.JsonValue | null;
    }>;
    private payeeName;
    private notifySubmitter;
    rejectMoney(assignmentId: string, dto: RejectMoneyDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TourReportStatus;
        notes: string | null;
        assignmentId: string;
        submittedById: string | null;
        submittedByName: string | null;
        submittedAt: Date;
        actualPax: number | null;
        pickupNotes: string | null;
        distanceKm: number | null;
        fuelCost: Prisma.Decimal | null;
        tollParking: Prisma.Decimal | null;
        verifiedById: string | null;
        verifiedByName: string | null;
        verifiedAt: Date | null;
        verificationNotes: string | null;
        finalizedById: string | null;
        finalizedByName: string | null;
        finalizedAt: Date | null;
        settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
        netAmount: Prisma.Decimal | null;
        moneyVerifiedById: string | null;
        moneyVerifiedByName: string | null;
        moneyVerifiedAt: Date | null;
        moneyVerificationNote: string | null;
        moneyPayableToId: string | null;
        moneyRejectedAt: Date | null;
        moneyRejectedById: string | null;
        moneyRejectedByName: string | null;
        moneyRejectionReason: string | null;
        evidenceImages: Prisma.JsonValue | null;
    }>;
    private watermarkFor;
    private resolvePayee;
    private classifyPayee;
    people(actor: AuthenticatedUser, query: ListPeopleQueryDto): Promise<{
        groups: {
            payeeType: import("@prisma/client").$Enums.PayeeType;
            label: string;
            payees: {
                paidThrough: Date | null;
                id: string;
                kind: "PERSON" | "PROVIDER";
                name: string;
                email: string | null;
                role: RoleType;
                userType: string | null;
                providerName: string | null;
                providerIsCompany: boolean | null;
                payeeType: PayeeType;
            }[];
        }[];
        payees: {
            paidThrough: Date | null;
            id: string;
            kind: "PERSON" | "PROVIDER";
            name: string;
            email: string | null;
            role: RoleType;
            userType: string | null;
            providerName: string | null;
            providerIsCompany: boolean | null;
            payeeType: PayeeType;
        }[];
    }>;
    periodPreview(actor: AuthenticatedUser, query: PeriodQueryDto): Promise<{
        mode: "ROUTE_PRICE";
        fromDate: Date;
        toDate: Date;
        person: Payee & {
            id: string;
            kind: "PERSON" | "PROVIDER";
            payeeType: PayeeType;
        };
        paidThrough: Date | null;
        lines: ({
            assignmentId: string;
            code: string | null;
            tourName: string | null;
            plateNumber: string | null;
            driver: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            } | null;
            tourDate: Date | null;
            amount: number;
            basis: "ROUTE_PRICE";
            priceMissing: boolean;
            direction: "COMPANY_TO_PROVIDER";
            guide?: undefined;
            verifiedAt?: undefined;
            netAmount?: undefined;
            flow?: undefined;
        } | {
            assignmentId: string;
            code: string | null;
            tourName: string | null;
            plateNumber: string | null;
            guide: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            driver: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            } | null;
            tourDate: Date | null;
            verifiedAt: Date | null;
            amount: number;
            basis: "NET_SETTLEMENT";
            netAmount: number;
            flow: import("@prisma/client").$Enums.FeeFlowType;
            direction: string;
            priceMissing?: undefined;
        })[];
        tourCount: number;
        totalPrice: number;
        companyReturnsToProvider: number;
        direction: "COMPANY_TO_PROVIDER";
        personReturnsToCompany?: undefined;
        companyReturnsToPerson?: undefined;
        totalNet?: undefined;
    } | {
        mode: "SETTLEMENT";
        fromDate: Date;
        toDate: Date;
        person: (Payee & {
            id: string;
            kind: "PERSON" | "PROVIDER";
            payeeType: PayeeType;
        }) | null;
        paidThrough: Date | null;
        lines: ({
            assignmentId: string;
            code: string | null;
            tourName: string | null;
            plateNumber: string | null;
            driver: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            } | null;
            tourDate: Date | null;
            amount: number;
            basis: "ROUTE_PRICE";
            priceMissing: boolean;
            direction: "COMPANY_TO_PROVIDER";
            guide?: undefined;
            verifiedAt?: undefined;
            netAmount?: undefined;
            flow?: undefined;
        } | {
            assignmentId: string;
            code: string | null;
            tourName: string | null;
            plateNumber: string | null;
            guide: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            driver: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            } | null;
            tourDate: Date | null;
            verifiedAt: Date | null;
            amount: number;
            basis: "NET_SETTLEMENT";
            netAmount: number;
            flow: import("@prisma/client").$Enums.FeeFlowType;
            direction: string;
            priceMissing?: undefined;
        })[];
        tourCount: number;
        personReturnsToCompany: number;
        companyReturnsToPerson: number;
        totalNet: number;
        direction: string;
        totalPrice?: undefined;
        companyReturnsToProvider?: undefined;
    }>;
    exportPeriod(actor: AuthenticatedUser, dto: ExportPeriodDto): Promise<{
        person: Payee & {
            id: string;
            kind: "PERSON" | "PROVIDER";
            payeeType: PayeeType;
        };
        note: string | null;
        mode: "ROUTE_PRICE";
        fromDate: Date;
        toDate: Date;
        paidThrough: Date | null;
        lines: ({
            assignmentId: string;
            code: string | null;
            tourName: string | null;
            plateNumber: string | null;
            driver: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            } | null;
            tourDate: Date | null;
            amount: number;
            basis: "ROUTE_PRICE";
            priceMissing: boolean;
            direction: "COMPANY_TO_PROVIDER";
            guide?: undefined;
            verifiedAt?: undefined;
            netAmount?: undefined;
            flow?: undefined;
        } | {
            assignmentId: string;
            code: string | null;
            tourName: string | null;
            plateNumber: string | null;
            guide: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            driver: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            } | null;
            tourDate: Date | null;
            verifiedAt: Date | null;
            amount: number;
            basis: "NET_SETTLEMENT";
            netAmount: number;
            flow: import("@prisma/client").$Enums.FeeFlowType;
            direction: string;
            priceMissing?: undefined;
        })[];
        tourCount: number;
        totalPrice: number;
        companyReturnsToProvider: number;
        direction: "COMPANY_TO_PROVIDER";
        personReturnsToCompany?: undefined;
        companyReturnsToPerson?: undefined;
        totalNet?: undefined;
        periodId: string;
    } | {
        person: Payee & {
            id: string;
            kind: "PERSON" | "PROVIDER";
            payeeType: PayeeType;
        };
        note: string | null;
        mode: "SETTLEMENT";
        fromDate: Date;
        toDate: Date;
        paidThrough: Date | null;
        lines: ({
            assignmentId: string;
            code: string | null;
            tourName: string | null;
            plateNumber: string | null;
            driver: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            } | null;
            tourDate: Date | null;
            amount: number;
            basis: "ROUTE_PRICE";
            priceMissing: boolean;
            direction: "COMPANY_TO_PROVIDER";
            guide?: undefined;
            verifiedAt?: undefined;
            netAmount?: undefined;
            flow?: undefined;
        } | {
            assignmentId: string;
            code: string | null;
            tourName: string | null;
            plateNumber: string | null;
            guide: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            driver: {
                id: string;
                name: string | null;
                providerId: string | null;
            } | null;
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            } | null;
            tourDate: Date | null;
            verifiedAt: Date | null;
            amount: number;
            basis: "NET_SETTLEMENT";
            netAmount: number;
            flow: import("@prisma/client").$Enums.FeeFlowType;
            direction: string;
            priceMissing?: undefined;
        })[];
        tourCount: number;
        personReturnsToCompany: number;
        companyReturnsToPerson: number;
        totalNet: number;
        direction: string;
        totalPrice?: undefined;
        companyReturnsToProvider?: undefined;
        periodId: string;
    }>;
    voidPeriod(actor: AuthenticatedUser, periodId: string, dto: VoidPeriodDto): Promise<{
        id: string;
        createdAt: Date;
        note: string | null;
        payeeType: import("@prisma/client").$Enums.PayeeType;
        fromDate: Date;
        toDate: Date;
        personId: string;
        createdById: string;
        createdByName: string | null;
        payeeName: string | null;
        tourCount: number;
        personReturnsToCompany: Prisma.Decimal;
        companyReturnsToPerson: Prisma.Decimal;
        totalNet: Prisma.Decimal;
        voidedAt: Date | null;
        voidedById: string | null;
        voidedByName: string | null;
        voidReason: string | null;
    }>;
    periodHistory(actor: AuthenticatedUser, personId?: string): Promise<{
        id: string;
        person: {
            id: string;
            name: string;
            role: string | null;
        };
        payeeType: import("@prisma/client").$Enums.PayeeType;
        voidedAt: Date | null;
        voidedByName: string | null;
        voidReason: string | null;
        fromDate: Date;
        toDate: Date;
        tourCount: number;
        personReturnsToCompany: number;
        companyReturnsToPerson: number;
        totalNet: number;
        direction: string;
        note: string | null;
        createdByName: string | null;
        createdAt: Date;
        lines: {
            assignmentId: string;
            tourName: string | null;
            tourDate: Date;
            netAmount: number;
            flow: import("@prisma/client").$Enums.FeeFlowType;
            note: string | null;
        }[];
    }[]>;
    watermarkOverview(actor: AuthenticatedUser): Promise<{
        personId: string;
        toDate: Date;
    }[]>;
    unverifiedReportCount(actor: AuthenticatedUser): Promise<number>;
}
