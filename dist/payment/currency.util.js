"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_VND_PER_USD = exports.MIN_VND_PER_USD = exports.DEFAULT_VND_PER_USD = void 0;
exports.parseVndPerUsd = parseVndPerUsd;
exports.convertBookingAmount = convertBookingAmount;
exports.DEFAULT_VND_PER_USD = 26000;
exports.MIN_VND_PER_USD = 5000;
exports.MAX_VND_PER_USD = 100000;
function parseVndPerUsd(raw) {
    if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
        return exports.DEFAULT_VND_PER_USD;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0)
        return null;
    const rounded = Math.round(value);
    if (rounded < exports.MIN_VND_PER_USD || rounded > exports.MAX_VND_PER_USD)
        return null;
    return rounded;
}
function roundUpToCents(value) {
    return Math.ceil(value * 100 - 1e-9) / 100;
}
function convertBookingAmount(amount, fromCurrency, toCurrency, vndPerUsd) {
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
        if (vndPerUsd == null ||
            !Number.isFinite(vndPerUsd) ||
            vndPerUsd < exports.MIN_VND_PER_USD ||
            vndPerUsd > exports.MAX_VND_PER_USD) {
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
//# sourceMappingURL=currency.util.js.map