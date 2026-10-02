import { AccountingService } from './accounting.service';
import { CreateSettlementCategoryDto, CreateSettlementDto, ExportPeriodDto, ListPeopleQueryDto, PeriodQueryDto, UpdateSettlementDto, VerifyTourMoneyDto, RejectMoneyDto, VoidPeriodDto } from './dto/accounting.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class AccountingController {
    private readonly accountingService;
    constructor(accountingService: AccountingService);
    listCategories(actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        isSystem: boolean;
        code: string;
        flowType: import("@prisma/client").$Enums.FeeFlowType;
    }[]>;
    createCategory(dto: CreateSettlementCategoryDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        isSystem: boolean;
        code: string;
        flowType: import("@prisma/client").$Enums.FeeFlowType;
    }>;
    listSettlements(assignmentId: string, actor: AuthenticatedUser): Promise<({
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
        amount: import("@prisma/client/runtime/library").Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    })[]>;
    createSettlement(assignmentId: string, dto: CreateSettlementDto, actor: AuthenticatedUser): Promise<{
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
        amount: import("@prisma/client/runtime/library").Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    }>;
    updateSettlement(id: string, dto: UpdateSettlementDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    }>;
    deleteSettlement(id: string, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        categoryId: string | null;
        createdById: string;
        createdByName: string | null;
        reversesId: string | null;
    }>;
    verificationQueue(actor: AuthenticatedUser): Promise<{
        assignmentId: string;
        code: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        submittedAt: Date | null;
        reportStatus: import("@prisma/client").$Enums.TourReportStatus | null;
        moneyVerifiedAt: Date | null;
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
        net: number;
        flow: "COLLECT_MONEY" | "PAY_MONEY";
        collected: number;
        paid: number;
        entryCount: number;
        waitingDays: number;
    }[]>;
    verifyTourMoney(assignmentId: string, dto: VerifyTourMoneyDto, actor: AuthenticatedUser): Promise<{
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
        fuelCost: import("@prisma/client/runtime/library").Decimal | null;
        tollParking: import("@prisma/client/runtime/library").Decimal | null;
        verifiedById: string | null;
        verifiedByName: string | null;
        verifiedAt: Date | null;
        verificationNotes: string | null;
        finalizedById: string | null;
        finalizedByName: string | null;
        finalizedAt: Date | null;
        settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
        netAmount: import("@prisma/client/runtime/library").Decimal | null;
        moneyVerifiedById: string | null;
        moneyVerifiedByName: string | null;
        moneyVerifiedAt: Date | null;
        moneyVerificationNote: string | null;
        moneyPayableToId: string | null;
        moneyRejectedAt: Date | null;
        moneyRejectedById: string | null;
        moneyRejectedByName: string | null;
        moneyRejectionReason: string | null;
        evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    rejectTourMoney(assignmentId: string, dto: RejectMoneyDto, actor: AuthenticatedUser): Promise<{
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
        fuelCost: import("@prisma/client/runtime/library").Decimal | null;
        tollParking: import("@prisma/client/runtime/library").Decimal | null;
        verifiedById: string | null;
        verifiedByName: string | null;
        verifiedAt: Date | null;
        verificationNotes: string | null;
        finalizedById: string | null;
        finalizedByName: string | null;
        finalizedAt: Date | null;
        settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
        netAmount: import("@prisma/client/runtime/library").Decimal | null;
        moneyVerifiedById: string | null;
        moneyVerifiedByName: string | null;
        moneyVerifiedAt: Date | null;
        moneyVerificationNote: string | null;
        moneyPayableToId: string | null;
        moneyRejectedAt: Date | null;
        moneyRejectedById: string | null;
        moneyRejectedByName: string | null;
        moneyRejectionReason: string | null;
        evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    people(query: ListPeopleQueryDto, actor: AuthenticatedUser): Promise<{
        groups: {
            payeeType: import("@prisma/client").$Enums.PayeeType;
            label: string;
            payees: {
                paidThrough: Date | null;
                id: string;
                kind: "PERSON" | "PROVIDER";
                name: string;
                email: string | null;
                role: import("@prisma/client").RoleType;
                userType: string | null;
                providerName: string | null;
                providerIsCompany: boolean | null;
                payeeType: import("@prisma/client").PayeeType;
            }[];
        }[];
        payees: {
            paidThrough: Date | null;
            id: string;
            kind: "PERSON" | "PROVIDER";
            name: string;
            email: string | null;
            role: import("@prisma/client").RoleType;
            userType: string | null;
            providerName: string | null;
            providerIsCompany: boolean | null;
            payeeType: import("@prisma/client").PayeeType;
        }[];
    }>;
    periodPreview(query: PeriodQueryDto, actor: AuthenticatedUser): Promise<{
        mode: "ROUTE_PRICE";
        fromDate: Date;
        toDate: Date;
        person: import("./accounting.service").Payee & {
            id: string;
            kind: "PERSON" | "PROVIDER";
            payeeType: import("@prisma/client").PayeeType;
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
        person: (import("./accounting.service").Payee & {
            id: string;
            kind: "PERSON" | "PROVIDER";
            payeeType: import("@prisma/client").PayeeType;
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
    exportPeriod(dto: ExportPeriodDto, actor: AuthenticatedUser): Promise<{
        person: import("./accounting.service").Payee & {
            id: string;
            kind: "PERSON" | "PROVIDER";
            payeeType: import("@prisma/client").PayeeType;
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
        person: import("./accounting.service").Payee & {
            id: string;
            kind: "PERSON" | "PROVIDER";
            payeeType: import("@prisma/client").PayeeType;
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
    watermarkOverview(actor: AuthenticatedUser): Promise<{
        personId: string;
        toDate: Date;
    }[]>;
    voidPeriod(id: string, dto: VoidPeriodDto, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        note: string | null;
        createdById: string;
        createdByName: string | null;
        payeeType: import("@prisma/client").$Enums.PayeeType;
        fromDate: Date;
        toDate: Date;
        personId: string;
        payeeName: string | null;
        tourCount: number;
        personReturnsToCompany: import("@prisma/client/runtime/library").Decimal;
        companyReturnsToPerson: import("@prisma/client/runtime/library").Decimal;
        totalNet: import("@prisma/client/runtime/library").Decimal;
        voidedAt: Date | null;
        voidedById: string | null;
        voidedByName: string | null;
        voidReason: string | null;
    }>;
    periodHistory(personId: string | undefined, actor: AuthenticatedUser): Promise<{
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
}
