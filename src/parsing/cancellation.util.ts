/**
 * Cancellation detection shared by every template parser.
 *
 * Booking CONFIRMATION emails routinely carry policy marketing text
 * ("Free cancellation until ...", "cancellation policy") — that text must never
 * flip a new booking to CANCEL. Rules:
 *  - subject: policy phrases are stripped first, then the broad keyword test runs
 *  - body (airbnb / booking-com): only strong past-tense cancellation
 *    statements count — a policy line or an FAQ ("How do I cancel?") never does
 *
 * The combined action decision (cancel vs amend vs create) lives in
 * `action.util.ts` — this file only owns the cancellation predicates.
 */

/** Marketing / policy phrases that appear inside confirmation emails. */
const POLICY_PHRASES =
  /\bfree\s+cancel(?:lation|ation)?(?:\s+until|\s+from|\s+on|\s+before|\s+after)?\b|\bcancell?ation\s+polic(?:y|ies)\b|\brefund\s+polic(?:y|ies)\b|\bfaqs?\b|\bcancell?ation\s+(?:deadline|window|period|fees?|charges?|terms?|rules?|conditions?|options?|dates?|rate)\b|\bhow\s+to\s+cancel\b|\bcan\s+i\s+cancel\b|\bto\s+cancel\s+this\b/gi;

/** Broad keyword test for a SUBJECT (policy phrases stripped beforehand). */
const SUBJECT_CANCEL =
  /\b(cancel|cancelled|canceled|cancellation|refunds?|refund|refunded)\b/i;

/**
 * Strong statements that only appear when a booking really was cancelled —
 * applied to the email BODY (subject+body+snippet for airbnb/booking-com).
 * Conditional/FAQ wording ("will be cancelled if...", "How do I cancel?")
 * deliberately does NOT match.
 */
const STRONG_BODY_CANCEL =
  /\b(?:has\s+been|was|been|now)\s+(?:cancelled|canceled)\b|\b(?:we|host|supplier|provider)\s+(?:have\s+|has\s+)?(?:just\s+)?(?:cancelled|canceled)\b|\b(?:cancelled|canceled)\s+(?:your|this)\s+(?:booking|reservation|order|tour|activity)\b|\bcancell?ation\s+(?:confirmation|confirmed|is\s+confirmed|complete|completed|successful)\b|\bcancell?ation\s+request\s+has\s+been\s+(?:completed|processed|fulfilled)\b|\brefund\s+(?:issued|processed|confirmation|has\s+been\s+issued|of\s+your)\b|\b(?:issued|processed)\s+(?:a\s+)?refund\b|\byou\s+won'?t\s+be\s+going\b/i;

/** Remove policy/marketing phrases so they cannot trigger the keyword test. */
export function stripPolicyPhrases(text: string): string {
  return text.replace(POLICY_PHRASES, ' ');
}

/** True when the SUBJECT announces a cancellation (policy text ignored). */
export function isCancellationSubject(subject: string): boolean {
  return SUBJECT_CANCEL.test(stripPolicyPhrases(subject));
}

/** True when the BODY contains a strong, past-tense cancellation statement. */
export function isCancellationBody(body: string): boolean {
  return STRONG_BODY_CANCEL.test(body);
}
