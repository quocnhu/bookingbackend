import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { PaymentService } from './payment.service';
import { CancelPayPalOrderDto, CapturePayPalOrderDto, CreatePayPalOrderDto, QueryBookingPaymentsDto, RecordOtaRemittanceDto } from './dto/payment.dto';
export declare class PaymentController {
    private readonly payments;
    constructor(payments: PaymentService);
    bookingPayments(query: QueryBookingPaymentsDto): Promise<{
        items: ({
            tour: {
                name: string;
                type: import("@prisma/client").$Enums.TourType;
                id: string;
            } | null;
            customerUser: {
                name: string | null;
                id: string;
                email: string;
            } | null;
            payments: {
                updatedAt: Date;
                id: string;
                createdAt: Date;
                provider: string | null;
                status: import("@prisma/client").$Enums.PaymentRecordStatus;
                currency: string;
                note: string | null;
                createdById: string | null;
                method: import("@prisma/client").$Enums.PaymentMethod;
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
                bookingId: string;
            }[];
        } & {
            updatedAt: Date;
            id: string;
            createdAt: Date;
            hotelId: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            hotelCommissionPercent: import("@prisma/client/runtime/library").Decimal | null;
            phone: string;
            address: string | null;
            currency: string;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: import("@prisma/client/runtime/library").JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            customerUserId: string | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            payLater: boolean;
            paymentDueAt: Date | null;
            paymentNote: string | null;
            totalAmount: import("@prisma/client/runtime/library").Decimal | null;
            paymentCollectedAt: Date | null;
            paymentCollectedById: string | null;
            paymentCollectedByName: string | null;
            paymentConfirmedAt: Date | null;
            paymentConfirmedById: string | null;
            paymentConfirmedByName: string | null;
            confirmationEmailSentAt: Date | null;
            pickupReminderSentAt: Date | null;
            lateBooking: boolean;
            paxSequence: number;
            parentBookingId: string | null;
            movedFromBusId: string | null;
            emailDate: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
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
    cancelOrder(dto: CancelPayPalOrderDto, actor: AuthenticatedUser): Promise<{
        cancelled: number;
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
        updatedAt: Date;
        id: string;
        createdAt: Date;
        provider: string | null;
        status: import("@prisma/client").$Enums.PaymentRecordStatus;
        currency: string;
        note: string | null;
        createdById: string | null;
        method: import("@prisma/client").$Enums.PaymentMethod;
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
