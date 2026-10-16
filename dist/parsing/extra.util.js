"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExtra = buildExtra;
const MAPPED_FIELDS = new Set([
    'action',
    'bookingRef',
    'confirmationCode',
    'source',
    'channel',
    'status',
    'tourId',
    'tourName',
    'tour',
    'tourType',
    'address',
    'billingAddress',
    'latitude',
    'longitude',
    'startingDate',
    'date',
    'checkIn',
    'checkin',
    'tripDate',
    'customerName',
    'customer',
    'billingName',
    'hotelName',
    'pickUp',
    'pickUpAddress',
    'phone',
    'customerPhone',
    'mail',
    'customerEmail',
    'billingEmail',
    'emailAddress',
    'totalPax',
    'travellers',
    'paxTotal',
    'pax',
    'paxDetail',
    'priceLines',
    'payment',
    'isNoShow',
    'noShow',
    'noShowReason',
    'provider',
    'extra',
]);
function buildExtra(rich) {
    const extra = {};
    for (const [key, value] of Object.entries(rich)) {
        if (MAPPED_FIELDS.has(key))
            continue;
        if (value === null || value === undefined)
            continue;
        if (typeof value === 'string' && value.trim() === '')
            continue;
        extra[key] = value;
    }
    return extra;
}
//# sourceMappingURL=extra.util.js.map