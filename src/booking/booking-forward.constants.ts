/**
 * Subject prefix of the "pushed to Booking table" notice that the system
 * forwards to the operator.
 *
 * It doubles as the loop guard: a mail carrying this prefix is a system notice,
 * never a booking mail, so ingestion ignores it (see GmailPubSubService).
 */
export const BOOKING_SYNC_SUBJECT_PREFIX = '[Booking Sync]';

/**
 * Custom header that marks a message as a system notice. Gmail keeps the
 * confirmation in the original conversation (In-Reply-To / References), so the
 * subject is the original one and cannot be used as the loop guard.
 */
export const BOOKING_SYNC_HEADER = 'X-Booking-Sync';
export const BOOKING_SYNC_HEADER_VALUE = '1';
