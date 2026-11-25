import {
  BookingProvider,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

export const UNPAID_CANCELLATION_REASON = 'PayPal payment not completed';
export const DEFAULT_UNPAID_GRACE_HOURS = 24;
export const UNPAID_CANCEL_BEFORE_CUTOFF_MINUTES = 30;

export type UnpaidBookingLike = {
  channel?: BookingProvider | string | null;
  status?: BookingStatus | string | null;
  payment?: PaymentStatus | string | null;
  paymentMethod?: PaymentMethod | string | null;
  payLater?: boolean | null;
};

export function unpaidGraceHours(): number {
  const value = Number(process.env.UNPAID_BOOKING_GRACE_HOURS ?? NaN);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_UNPAID_GRACE_HOURS;
  return Math.min(24 * 30, Math.max(1, value));
}

export function isUnpaidPayPalBooking(booking: UnpaidBookingLike): boolean {
  return (
    booking.channel === BookingProvider.WEBSITE &&
    booking.payment === PaymentStatus.PENDING &&
    booking.paymentMethod === PaymentMethod.PAYPAL &&
    booking.payLater !== true &&
    booking.status !== BookingStatus.CANCELED
  );
}

export function unpaidCancelAt(
  createdAt: Date | string,
  cutoffAt?: Date | string | null,
  graceHours: number = unpaidGraceHours(),
): Date {
  const created = new Date(createdAt);
  const due = new Date(created.getTime() + graceHours * 60 * 60 * 1000);
  if (!cutoffAt) return due;
  const cutoff = new Date(cutoffAt);
  if (Number.isNaN(cutoff.getTime())) return due;
  const guard = new Date(
    cutoff.getTime() - UNPAID_CANCEL_BEFORE_CUTOFF_MINUTES * 60 * 1000,
  );
  if (guard.getTime() <= created.getTime()) return due;
  return new Date(Math.min(due.getTime(), guard.getTime()));
}
