"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNPAID_CANCEL_BEFORE_CUTOFF_MINUTES = exports.DEFAULT_UNPAID_GRACE_HOURS = exports.UNPAID_CANCELLATION_REASON = void 0;
exports.unpaidGraceHours = unpaidGraceHours;
exports.isUnpaidPayPalBooking = isUnpaidPayPalBooking;
exports.unpaidCancelAt = unpaidCancelAt;
const client_1 = require("@prisma/client");
exports.UNPAID_CANCELLATION_REASON = 'PayPal payment not completed';
exports.DEFAULT_UNPAID_GRACE_HOURS = 24;
exports.UNPAID_CANCEL_BEFORE_CUTOFF_MINUTES = 30;
function unpaidGraceHours() {
    const value = Number(process.env.UNPAID_BOOKING_GRACE_HOURS ?? NaN);
    if (!Number.isFinite(value) || value <= 0)
        return exports.DEFAULT_UNPAID_GRACE_HOURS;
    return Math.min(24 * 30, Math.max(1, value));
}
function isUnpaidPayPalBooking(booking) {
    return (booking.channel === client_1.BookingProvider.WEBSITE &&
        booking.payment === client_1.PaymentStatus.PENDING &&
        booking.paymentMethod === client_1.PaymentMethod.PAYPAL &&
        booking.payLater !== true &&
        booking.status !== client_1.BookingStatus.CANCELED);
}
function unpaidCancelAt(createdAt, cutoffAt, graceHours = unpaidGraceHours()) {
    const created = new Date(createdAt);
    const due = new Date(created.getTime() + graceHours * 60 * 60 * 1000);
    if (!cutoffAt)
        return due;
    const cutoff = new Date(cutoffAt);
    if (Number.isNaN(cutoff.getTime()))
        return due;
    const guard = new Date(cutoff.getTime() - exports.UNPAID_CANCEL_BEFORE_CUTOFF_MINUTES * 60 * 1000);
    if (guard.getTime() <= created.getTime())
        return due;
    return new Date(Math.min(due.getTime(), guard.getTime()));
}
//# sourceMappingURL=unpaid-booking.util.js.map