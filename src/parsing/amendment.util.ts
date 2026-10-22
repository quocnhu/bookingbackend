/**
 * Amendment detection shared by every template parser.
 *
 * An AMENDMENT email carries the SAME booking reference as the original
 * confirmation but different details (new date, new pax, new hotel, new
 * pickup point). It must be applied to the existing booking instead of
 * creating a second one — see `BookingService.upsert`.
 *
 * False-positive guards (same spirit as the cancellation detector):
 *  - policy / marketing phrases are stripped first ("cancellation policy",
 *    "free cancellation until…", "how do I cancel") — a policy line must
 *    never turn a plain confirmation into an amendment;
 *  - a change word alone is not enough: it must be tied to the booking
 *    ("your booking has been updated"), so "please update your payment
 *    details" is NOT an amendment;
 *  - only past-tense statements count — a promise ("your booking will be
 *    updated") is not an amendment;
 *  - "cancel" is deliberately absent from the verb list: a cancellation is
 *    the CANCEL action, never an amendment.
 */

/**
 * The noun a change applies to. Longest alternative first so "booking
 * details" wins over "booking".
 */
const BOOKING_NOUN =
  'booking details|reservation details|booking|reservation|itinerary|order|trip';

/** Past-tense "something changed" verbs (never "cancel" — that is CANCEL). */
const CHANGE_VERBS =
  'amended|amendment|modified|modification|updated|update|changed|change|revised|revision|corrected|correction';

/**
 * "your booking has been updated" / "the reservation was amended".
 *
 * The verb must FOLLOW the noun, so a marketing line that mentions a change
 * word before the noun ("please update your booking details") is not matched
 * here — that is handled by the body patterns only when the sentence really
 * states that the booking was changed.
 */
const NOUN_THEN_VERB = new RegExp(
  `\\b(?:${BOOKING_NOUN})\\b[^.!?\\n]{0,25}?\\b(?:has|have|had|was|were|is|are)\\s+(?:been\\s+)?(?:${CHANGE_VERBS})\\b`,
  'i',
);

/**
 * "changes to your booking" / "an update on your reservation".
 */
const CHANGE_TO_NOUN = new RegExp(
  `\\b(?:changes?|updates?|modifications?|amendments?|corrections?|revisions?)\\s+(?:to|in|of|for|regarding|about)\\s+(?:your|the|this)\\s+(?:${BOOKING_NOUN})\\b`,
  'i',
);

/**
 * "booking update" / "booking modification" / "reservation change".
 */
const NOUN_CHANGE = new RegExp(
  `\\b(?:${BOOKING_NOUN})\\s+(?:${CHANGE_VERBS})\\b`,
  'i',
);

/**
 * "amended booking" / "updated reservation" (adjective form).
 */
const VERB_NOUN = new RegExp(
  `\\b(?:amended|modified|updated|revised|corrected)\\s+(?:${BOOKING_NOUN})\\b`,
  'i',
);

/**
 * "we have updated your booking" / "the supplier has amended this reservation".
 */
const WE_CHANGED_NOUN = new RegExp(
  `\\b(?:we|our\\s+team|the\\s+supplier|the\\s+operator|the\\s+host|the\\s+provider|the\\s+merchant)\\s+(?:have\\s+|has\\s+)?(?:just\\s+)?(?:${CHANGE_VERBS})\\s+(?:your|the|this)\\s+(?:${BOOKING_NOUN})\\b`,
  'i',
);

/**
 * "changes have been made to your booking".
 */
const CHANGES_MADE = new RegExp(
  `\\bchanges?\\s+(?:have|has|were|was)\\s+(?:been\\s+)?made\\s+to\\s+(?:your|the|this)\\s+(?:${BOOKING_NOUN})\\b`,
  'i',
);

/**
 * Patterns trusted in the SUBJECT — the subject is a short, deliberate title,
 * so a change word next to the booking noun is enough.
 */
const SUBJECT_PATTERNS: RegExp[] = [
  NOUN_THEN_VERB,
  CHANGE_TO_NOUN,
  NOUN_CHANGE,
  VERB_NOUN,
];

/**
 * Patterns trusted in the BODY — the body is long and full of boilerplate, so
 * only explicit sentences count.
 */
const BODY_PATTERNS: RegExp[] = [
  ...SUBJECT_PATTERNS,
  WE_CHANGED_NOUN,
  CHANGES_MADE,
];

/** True when the SUBJECT announces a change to an existing booking. */
export function isAmendmentSubject(subject: string): boolean {
  return SUBJECT_PATTERNS.some((re) => re.test(subject));
}

/** True when the BODY states that the booking was changed. */
export function isAmendmentBody(body: string): boolean {
  return BODY_PATTERNS.some((re) => re.test(body));
}
