export declare const DEFAULT_VND_PER_USD = 26000;
export declare const MIN_VND_PER_USD = 5000;
export declare const MAX_VND_PER_USD = 100000;
export type ConvertedAmount = {
    value: number;
    currency: string;
    rate: number;
};
export type ConversionResult = {
    ok: true;
    converted: ConvertedAmount;
} | {
    ok: false;
    reason: 'INVALID_AMOUNT' | 'INVALID_RATE' | 'UNSUPPORTED_CURRENCY';
};
export declare function parseVndPerUsd(raw: string | number | null | undefined): number | null;
export declare function convertBookingAmount(amount: number, fromCurrency: string, toCurrency: string, vndPerUsd: number | null): ConversionResult;
