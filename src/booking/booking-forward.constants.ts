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

/**
 * Body markers of the same system notice. The custom header is lost when the
 * operator forwards the notice again, so ingestion also checks the body text.
 */
export const BOOKING_SYNC_BODY_MARKER =
  'was pushed to the Booking table successfully';
export const BOOKING_SYNC_DUPLICATE_BODY_MARKER =
  'was blocked as a duplication and not re-processed';

/**
 * Dedup claim for the "duplication blocked" notice. A re-sent booking mail
 * produces one notice; every later duplicate of the same booking ref is
 * suppressed so the operator's inbox is not spammed. Kept for 30 days.
 */
export const DUPLICATE_NOTICE_TTL_SECONDS = 30 * 24 * 60 * 60;

export const duplicateNoticeKey = (mailbox: string, bookingRef: string) =>
  `booking-forward:duplicate-notice:${mailbox}:${bookingRef}`;
