import {
  UNPAID_CANCEL_BEFORE_CUTOFF_MINUTES,
  isUnpaidPayPalBooking,
  unpaidCancelAt,
  unpaidGraceHours,
} from './unpaid-booking.util';

describe('unpaid-booking.util', () => {
  describe('isUnpaidPayPalBooking', () => {
    const base = {
      channel: 'WEBSITE' as const,
      status: 'PENDING' as const,
      payment: 'PENDING' as const,
      paymentMethod: 'PAYPAL' as const,
      payLater: false,
    };

    it('flags an unpaid website PayPal booking', () => {
      expect(isUnpaidPayPalBooking(base)).toBe(true);
    });

    it('does not flag pay-later bookings', () => {
      expect(isUnpaidPayPalBooking({ ...base, payLater: true })).toBe(false);
    });

    it('does not flag paid, canceled or non-website bookings', () => {
      expect(isUnpaidPayPalBooking({ ...base, payment: 'PAID' })).toBe(false);
      expect(isUnpaidPayPalBooking({ ...base, status: 'CANCELED' })).toBe(
        false,
      );
      expect(isUnpaidPayPalBooking({ ...base, channel: 'MANUAL' })).toBe(
        false,
      );
      expect(isUnpaidPayPalBooking({ ...base, paymentMethod: 'CASH' })).toBe(
        false,
      );
    });
  });

  describe('unpaidCancelAt', () => {
    afterEach(() => {
      delete process.env.UNPAID_BOOKING_GRACE_HOURS;
    });

    it('defaults to a 30 minute grace window', () => {
      expect(unpaidGraceHours()).toBe(0.5);
    });

    it('honours the configured grace window', () => {
      process.env.UNPAID_BOOKING_GRACE_HOURS = '6';
      expect(unpaidGraceHours()).toBe(6);
    });

    it('caps the deadline before the dispatch cutoff', () => {
      const createdAt = new Date('2026-11-25T00:00:00.000Z');
      const cutoffAt = new Date('2026-11-25T10:00:00.000Z');
      const due = unpaidCancelAt(createdAt, cutoffAt, 24);
      expect(due.getTime()).toBe(
        cutoffAt.getTime() - UNPAID_CANCEL_BEFORE_CUTOFF_MINUTES * 60 * 1000,
      );
    });

    it('keeps the grace window when the cutoff is already past at creation', () => {
      const createdAt = new Date('2026-11-25T20:00:00.000Z');
      const cutoffAt = new Date('2026-11-25T10:00:00.000Z');
      const due = unpaidCancelAt(createdAt, cutoffAt, 24);
      expect(due.getTime()).toBe(
        createdAt.getTime() + 24 * 60 * 60 * 1000,
      );
    });
  });
});
