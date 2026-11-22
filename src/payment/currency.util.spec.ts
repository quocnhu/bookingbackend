import {
  convertBookingAmount as convert,
  DEFAULT_VND_PER_USD,
  MAX_VND_PER_USD,
  MIN_VND_PER_USD,
  parseVndPerUsd,
} from './currency.util';

describe('currency.util', () => {
  describe('parseVndPerUsd', () => {
    it('defaults to 26,000 when the env value is missing', () => {
      expect(parseVndPerUsd(undefined)).toBe(DEFAULT_VND_PER_USD);
      expect(parseVndPerUsd(null)).toBe(DEFAULT_VND_PER_USD);
      expect(parseVndPerUsd('')).toBe(DEFAULT_VND_PER_USD);
    });

    it('accepts a sane configured rate', () => {
      expect(parseVndPerUsd('26000')).toBe(26000);
      expect(parseVndPerUsd(25500.4)).toBe(25500);
    });

    it('rejects negative, non-numeric and out-of-bounds rates', () => {
      expect(parseVndPerUsd('-1')).toBeNull();
      expect(parseVndPerUsd('abc')).toBeNull();
      expect(parseVndPerUsd(MIN_VND_PER_USD - 1)).toBeNull();
      expect(parseVndPerUsd(MAX_VND_PER_USD + 1)).toBeNull();
      expect(parseVndPerUsd(1)).toBeNull();
    });
  });

  describe('convertBookingAmount', () => {
    it('converts VND to USD at 26,000', () => {
      const result = convert(5200000, 'VND', 'USD', 26000);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.converted.value).toBe(200);
        expect(result.converted.currency).toBe('USD');
        expect(result.converted.rate).toBe(26000);
      }
    });

    it('rounds up to the cent so the company never under-collects', () => {
      const result = convert(100001, 'VND', 'USD', 26000);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.converted.value).toBe(3.85);
      }
    });

    it('keeps a same-currency amount unchanged', () => {
      const result = convert(19.999, 'usd', 'USD', 26000);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.converted.value).toBe(20);
        expect(result.converted.rate).toBe(1);
      }
    });

    it('rejects an invalid or missing rate for VND -> USD', () => {
      expect(convert(100000, 'VND', 'USD', null)).toEqual({
        ok: false,
        reason: 'INVALID_RATE',
      });
      expect(convert(100000, 'VND', 'USD', 1)).toEqual({
        ok: false,
        reason: 'INVALID_RATE',
      });
    });

    it('rejects an invalid amount and unsupported currency', () => {
      expect(convert(0, 'VND', 'USD', 26000)).toEqual({
        ok: false,
        reason: 'INVALID_AMOUNT',
      });
      expect(convert(100, 'EUR', 'USD', 26000)).toEqual({
        ok: false,
        reason: 'UNSUPPORTED_CURRENCY',
      });
    });
  });
});
