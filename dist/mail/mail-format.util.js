"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAIL_TIME_ZONE = void 0;
exports.escapeHtml = escapeHtml;
exports.formatMailDate = formatMailDate;
exports.formatMoney = formatMoney;
exports.formatDuration = formatDuration;
exports.asSentence = asSentence;
exports.MAIL_TIME_ZONE = 'Asia/Ho_Chi_Minh';
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function formatMailDate(value) {
    if (!value)
        return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return '-';
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: exports.MAIL_TIME_ZONE,
    }).format(date);
}
function formatMoney(value, currency) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount))
        return '-';
    const code = (currency || 'VND').toUpperCase();
    if (code === 'VND') {
        return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} ₫`;
    }
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: code,
        }).format(amount);
    }
    catch {
        return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)} ${code}`;
    }
}
function formatDuration(days) {
    const value = Number(days ?? 0);
    if (!Number.isFinite(value) || value <= 0)
        return '-';
    return value === 1 ? '1 day' : `${value} days`;
}
function asSentence(name) {
    return /[.!?]$/.test(name) ? name : `${name}.`;
}
//# sourceMappingURL=mail-format.util.js.map