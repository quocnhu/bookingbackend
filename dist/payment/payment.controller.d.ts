import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { PaymentService } from './payment.service';
import { CapturePayPalOrderDto, CreatePayPalOrderDto, RecordOtaRemittanceDto } from './dto/payment.dto';
export declare class PaymentController {
    private readonly payments;
    constructor(payments: PaymentService);
    paypalConfig(): {
        enabled: boolean;
        provider: string;
        mode: "sandbox" | "live";
        clientId: string | null;
        currency: string;
        vndPerUsd: number;
    };
    createOrder(dto: CreatePayPalOrderDto, actor: AuthenticatedUser): Promise<{
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
    captureOrder(dto: CapturePayPalOrderDto, actor: AuthenticatedUser): Promise<{
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
    recordOtaRemittance(dto: RecordOtaRemittanceDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        provider: string | null;
        status: import("@prisma/client").$Enums.PaymentRecordStatus;
        currency: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        note: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        payerType: import("@prisma/client").$Enums.PayerType;
        providerOrderId: string | null;
        providerCaptureId: string | null;
        providerAmount: import("@prisma/client/runtime/library").Decimal | null;
        providerCurrency: string | null;
        exchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        grossAmount: import("@prisma/client/runtime/library").Decimal | null;
        commissionAmount: import("@prisma/client/runtime/library").Decimal | null;
        paidAt: Date | null;
        confirmedById: string | null;
        confirmedByName: string | null;
        rawPayload: import("@prisma/client/runtime/library").JsonValue | null;
        createdById: string | null;
        bookingId: string;
    }>;
    webhook(req: RawBodyRequest<Request>, headers: Record<string, string | string[] | undefined>): Promise<{
        received: boolean;
        ignored: boolean;
    } | {
        received: boolean;
        ignored?: undefined;
    }>;
}
