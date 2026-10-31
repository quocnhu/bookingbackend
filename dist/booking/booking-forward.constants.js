"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicateNoticeKey = exports.DUPLICATE_NOTICE_TTL_SECONDS = exports.BOOKING_SYNC_DUPLICATE_BODY_MARKER = exports.BOOKING_SYNC_BODY_MARKER = exports.BOOKING_SYNC_HEADER_VALUE = exports.BOOKING_SYNC_HEADER = exports.BOOKING_SYNC_SUBJECT_PREFIX = void 0;
exports.BOOKING_SYNC_SUBJECT_PREFIX = '[Booking Sync]';
exports.BOOKING_SYNC_HEADER = 'X-Booking-Sync';
exports.BOOKING_SYNC_HEADER_VALUE = '1';
exports.BOOKING_SYNC_BODY_MARKER = 'was pushed to the Booking table successfully';
exports.BOOKING_SYNC_DUPLICATE_BODY_MARKER = 'was blocked as a duplication and not re-processed';
exports.DUPLICATE_NOTICE_TTL_SECONDS = 30 * 24 * 60 * 60;
const duplicateNoticeKey = (mailbox, bookingRef) => `booking-forward:duplicate-notice:${mailbox}:${bookingRef}`;
exports.duplicateNoticeKey = duplicateNoticeKey;
//# sourceMappingURL=booking-forward.constants.js.map