/**
 * Server-side PayPal amount conversion.
 *
 * The browser never supplies an amount or a rate: the order is always built
 * from `Booking.totalAmount` (recomputed by the server when the booking is
 * created) and the rate configured in the backend environment.
 */

export const DEFAULT_VND_PER_USD = 26000;
/** Reject a mis-typed rate instead of charging 1/1000th or 1000x the price. */
export const MIN_VND_PER_USD = 5000;
export const MAX_VND_PER_USD = 100000;

export type ConvertedAmount = {
  value: number;
  currency: string;
  rate: number;
};

export type ConversionResult =
  | { ok: true; converted: ConvertedAmount }
  | {
      ok: false;
      reason: 'INVALID_AMOUNT' | 'INVALID_RATE' | 'UNSUPPORTED_CURRENCY';
    };

export function parseVndPerUsd(
  raw: string | number | null | undefined,
): number | null {
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
    return DEFAULT_VND_PER_USD;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  const rounded = Math.round(value);
  if (rounded < MIN_VND_PER_USD || rounded > MAX_VND_PER_USD) return null;
  return rounded;
}

/**
 * Round the converted amount UP to the cent so the company never under-collects
 * the VND total through PayPal rounding.
 */
function roundUpToCents(value: number): number {
  return Math.ceil(value * 100 - 1e-9) / 100;
}

export function convertBookingAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  vndPerUsd: number | null,
): ConversionResult {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: 'INVALID_AMOUNT' };
  }
  const from = (fromCurrency ?? '').toUpperCase();
  const to = (toCurrency ?? '').toUpperCase();
  if (from === to) {
    return {
      ok: true,
      converted: {
        value: roundUpToCents(amount),
        currency: to,
        rate: 1,
      },
    };
  }
  if (from === 'VND' && to === 'USD') {
    if (
      vndPerUsd == null ||
      !Number.isFinite(vndPerUsd) ||
      vndPerUsd < MIN_VND_PER_USD ||
      vndPerUsd > MAX_VND_PER_USD
    ) {
      return { ok: false, reason: 'INVALID_RATE' };
    }
    return {
      ok: true,
      converted: {
        value: roundUpToCents(amount / vndPerUsd),
        currency: to,
        rate: vndPerUsd,
      },
    };
  }
  return { ok: false, reason: 'UNSUPPORTED_CURRENCY' };
}
