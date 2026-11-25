import { BookingProvider, BookingStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
export declare const UNPAID_CANCELLATION_REASON = "PayPal payment not completed";
export declare const DEFAULT_UNPAID_GRACE_HOURS = 24;
export declare const UNPAID_CANCEL_BEFORE_CUTOFF_MINUTES = 30;
export type UnpaidBookingLike = {
    channel?: BookingProvider | string | null;
    status?: BookingStatus | string | null;
    payment?: PaymentStatus | string | null;
    paymentMethod?: PaymentMethod | string | null;
    payLater?: boolean | null;
};
export declare function unpaidGraceHours(): number;
export declare function isUnpaidPayPalBooking(booking: UnpaidBookingLike): boolean;
export declare function unpaidCancelAt(createdAt: Date | string, cutoffAt?: Date | string | null, graceHours?: number): Date;
