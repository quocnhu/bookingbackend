"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PICKUP_REMINDER_LEAD_MINUTES = exports.DEFAULT_PICKUP_REMINDER_TIME = exports.PICKUP_REMINDER_TIME_ZONE = void 0;
exports.isValidHhmm = isValidHhmm;
exports.hhmmToMinutes = hhmmToMinutes;
exports.minutesToHhmm = minutesToHhmm;
exports.hcmDateKey = hcmDateKey;
exports.hcmTimeMinutes = hcmTimeMinutes;
exports.bookingPickupMinutes = bookingPickupMinutes;
exports.effectiveReminderMinutes = effectiveReminderMinutes;
exports.shouldSendReminderNow = shouldSendReminderNow;
exports.PICKUP_REMINDER_TIME_ZONE = 'Asia/Ho_Chi_Minh';
exports.DEFAULT_PICKUP_REMINDER_TIME = '06:00';
exports.PICKUP_REMINDER_LEAD_MINUTES = 60;
const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
function isValidHhmm(value) {
    return HHMM_PATTERN.test((value ?? '').trim());
}
function hhmmToMinutes(value) {
    const clean = (value ?? '').trim();
    if (!HHMM_PATTERN.test(clean))
        return null;
    const [h, m] = clean.split(':').map(Number);
    return h * 60 + m;
}
function minutesToHhmm(minutes) {
    const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function hcmDateKey(date) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: exports.PICKUP_REMINDER_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}
function hcmTimeMinutes(date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: exports.PICKUP_REMINDER_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
}
function bookingPickupMinutes(departureTime, tourDepartureTimes) {
    return (hhmmToMinutes(departureTime) ??
        hhmmToMinutes(tourDepartureTimes?.[0] ?? null));
}
function effectiveReminderMinutes(configuredMinutes, earliestPickupMinutes, leadMinutes = exports.PICKUP_REMINDER_LEAD_MINUTES) {
    if (earliestPickupMinutes == null)
        return configuredMinutes;
    return Math.max(0, Math.min(configuredMinutes, earliestPickupMinutes - leadMinutes));
}
function shouldSendReminderNow(input) {
    if (input.earliestPickupMinutes != null &&
        input.nowMinutes >= input.earliestPickupMinutes) {
        return false;
    }
    return (input.nowMinutes >=
        effectiveReminderMinutes(input.configuredMinutes, input.earliestPickupMinutes));
}
//# sourceMappingURL=pickup-reminder.util.js.map