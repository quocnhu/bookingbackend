import {
  isCancellationBody,
  isCancellationSubject,
  stripPolicyPhrases,
} from './cancellation.util';
import { isAmendmentBody, isAmendmentSubject } from './amendment.util';

/**
 * What an incoming email means for the booking it references.
 *
 *  - CREATE  — a new booking (or a re-sent confirmation of a known one)
 *  - MODIFY  — an amendment: the SAME reference with different details
 *  - CANCEL  — the booking was cancelled
 */
export type EmailAction = 'CREATE' | 'MODIFY' | 'CANCEL';

/**
 * Decide the action for an email.
 *
 * Precedence is deliberate: CANCEL wins over MODIFY, because a cancellation
 * email often also mentions that the booking "has been changed" (the refund
 * paragraph), and losing the cancellation would leave a phantom passenger on
 * the bus. MODIFY wins over CREATE because an amendment email IS a
 * confirmation of the same booking with new details.
 *
 * Policy / marketing text is stripped from the subject first, so
 * "Free cancellation until 24 hours before departure — booking update" is
 * still only a policy line and never a state change.
 */
export function detectAction(subject: string, body?: string): EmailAction {
  const cleanSubject = stripPolicyPhrases(subject ?? '');
  if (isCancellationSubject(cleanSubject)) return 'CANCEL';
  if (body && isCancellationBody(body)) return 'CANCEL';

  if (isAmendmentSubject(cleanSubject)) return 'MODIFY';
  if (body && isAmendmentBody(body)) return 'MODIFY';

  return 'CREATE';
}

/**
 * The plain-text body of an ingested email, used by the body-based action
 * detection. Gmail hands the text/plain part over in `payload.body` and the
 * preview snippet in `payload.snippet` — either of them may carry the
 * sentence that decides the action, so both are read.
 */
export function emailBodyText(payload: Record<string, unknown>): string {
  const parts = [payload?.body, payload?.snippet];
  return parts
    .map((p) => (typeof p === 'string' ? p : ''))
    .filter((p) => p.trim() !== '')
    .join('\n');
}
