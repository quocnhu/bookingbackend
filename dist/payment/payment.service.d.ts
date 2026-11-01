import { Prisma } from '@prisma/client';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class PaymentService {
    private readonly prisma;
    private readonly audit;
    private readonly logger;
    private tokenCache;
    constructor(prisma: PrismaService, audit: AuditService);
    private get mode();
    private get baseUrl();
    private get clientId();
    private get clientSecret();
    private get currency();
    private get vndPerUsd();
    isConfigured(): boolean;
    publicConfig(): {
        enabled: boolean;
        provider: string;
        mode: "sandbox" | "live";
        clientId: string | null;
        currency: string;
        vndPerUsd: number;
    };
    private assertConfigured;
    private accessToken;
    private request;
    private bookingForCustomer;
    private providerAmount;
    createPayPalOrder(bookingId: string, actor: AuthenticatedUser): Promise<{
        orderId: string;
        status: import("@prisma/client").$Enums.PaymentRecordStatus;
        providerAmount: number;
        providerCurrency: string | null;
        bookingTotal: number;
        bookingCurrency: string;
        approveUrl?: undefined;
    } | {
        orderId: string;
        status: string;
        approveUrl: string | null;
        providerAmount: number;
        providerCurrency: string;
        bookingTotal: number;
        bookingCurrency: string;
    }>;
    private captureDetails;
    private markCaptured;
    capturePayPalOrder(bookingId: string, orderId: string, actor: AuthenticatedUser, note?: string): Promise<{
        status: string;
        alreadyCaptured: boolean;
        paymentId: string;
        orderId?: undefined;
        captureId?: undefined;
    } | {
        status: string;
        paymentId: string;
        orderId: string;
        captureId: string | null;
        alreadyCaptured?: undefined;
    }>;
    recordOtaRemittance(bookingId: string, dto: {
        netAmount: number;
        grossAmount?: number;
        commissionAmount?: number;
        paidAt?: string;
        reference?: string;
        note?: string;
    }, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        provider: string | null;
        status: import("@prisma/client").$Enums.PaymentRecordStatus;
        currency: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        note: string | null;
        amount: Prisma.Decimal;
        payerType: import("@prisma/client").$Enums.PayerType;
        providerOrderId: string | null;
        providerCaptureId: string | null;
        providerAmount: Prisma.Decimal | null;
        providerCurrency: string | null;
        exchangeRate: Prisma.Decimal | null;
        grossAmount: Prisma.Decimal | null;
        commissionAmount: Prisma.Decimal | null;
        paidAt: Date | null;
        confirmedById: string | null;
        confirmedByName: string | null;
        rawPayload: Prisma.JsonValue | null;
        createdById: string | null;
        bookingId: string;
    }>;
    verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string, event: any): Promise<{
        received: boolean;
        ignored: boolean;
    } | {
        received: boolean;
        ignored?: undefined;
    }>;
    private handleWebhookEvent;
}
