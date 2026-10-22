"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEmailUpdateData = buildEmailUpdateData;
exports.hasBookingChanges = hasBookingChanges;
const client_1 = require("@prisma/client");
function buildEmailUpdateData(parsed, existing, action) {
    const data = {};
    for (const [key, value] of Object.entries(parsed)) {
        if (value === undefined)
            continue;
        data[key] = value;
    }
    delete data.bookingRef;
    delete data.source;
    if (isThreadRelayMail(parsed) && existing.mail) {
        delete data.mail;
    }
    const mergedExtra = {
        ...(existing.extra ?? {}),
        ...(parsed.extra ?? {}),
    };
    if (Object.keys(mergedExtra).length)
        data.extra = mergedExtra;
    else
        delete data.extra;
    data.status = action === 'CANCEL' ? client_1.BookingStatus.CANCELED : existing.status;
    return data;
}
function isThreadRelayMail(parsed) {
    const extra = parsed.extra;
    return extra?.mailSource === 'thread-relay';
}
function hasBookingChanges(data, existing) {
    for (const [key, value] of Object.entries(data)) {
        if (key === 'emailDate' || key === 'extra')
            continue;
        if (value instanceof Date) {
            const before = existing[key];
            if (before instanceof Date && before.getTime() === value.getTime()) {
                continue;
            }
            return true;
        }
        if (existing[key] !== value)
            return true;
    }
    return false;
}
//# sourceMappingURL=email-merge.util.js.map