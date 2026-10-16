"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBookingChannel = resolveBookingChannel;
const client_1 = require("@prisma/client");
const CHANNEL_MATCHERS = [
    [/viator/i, client_1.BookingProvider.VIATOR],
    [/get\s*your\s*guide/i, client_1.BookingProvider.GETYOURGUIDE],
    [/booking\.com/i, client_1.BookingProvider.BOOKING_COM],
    [/airbnb/i, client_1.BookingProvider.AIRBNB],
    [/tripadvisor/i, client_1.BookingProvider.TRIPADVISOR],
    [/website/i, client_1.BookingProvider.WEBSITE],
];
function resolveBookingChannel(...candidates) {
    for (const candidate of candidates) {
        if (typeof candidate !== 'string')
            continue;
        const text = candidate.trim();
        if (!text)
            continue;
        for (const [pattern, provider] of CHANNEL_MATCHERS) {
            if (pattern.test(text))
                return provider;
        }
    }
    return undefined;
}
//# sourceMappingURL=channel.util.js.map