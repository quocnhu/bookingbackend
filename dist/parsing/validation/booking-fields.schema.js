"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBookingFields = validateBookingFields;
const SOURCES = new Set([
    'airbnb',
    'booking-com',
    'tripadvisor',
    'website',
    'manual',
]);
function validateBookingFields(fields) {
    const errors = [];
    if (!fields.bookingRef)
        errors.push('Missing bookingRef/confirmationCode');
    if (!fields.source)
        errors.push('Missing source');
    else if (!SOURCES.has(fields.source))
        errors.push(`Unknown source: ${fields.source}`);
    if (fields.startingDate && Number.isNaN(Date.parse(fields.startingDate))) {
        errors.push(`Invalid startingDate: ${fields.startingDate}`);
    }
    if (fields.totalPax != null &&
        (!Number.isFinite(fields.totalPax) || fields.totalPax < 0)) {
        errors.push(`Invalid totalPax: ${fields.totalPax}`);
    }
    if (fields.latitude != null && !Number.isFinite(fields.latitude)) {
        errors.push(`Invalid latitude: ${fields.latitude}`);
    }
    if (fields.longitude != null && !Number.isFinite(fields.longitude)) {
        errors.push(`Invalid longitude: ${fields.longitude}`);
    }
    if (errors.length)
        return { valid: false, errors };
    return { valid: true, errors: [], data: fields };
}
//# sourceMappingURL=booking-fields.schema.js.map