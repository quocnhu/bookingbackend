export type ResponseMailHeaders = {
  subject?: string | null;
  autoSubmitted?: string | null;
  inReplyTo?: string | null;
  xAutoreply?: string | null;
  xAutorespond?: string | null;
};

const REPLY_SUBJECT = /^\s*(re|aw|sv|res|odp)\s*:/i;

export function isResponseEmail(mail: ResponseMailHeaders): boolean {
  const autoSubmitted = (mail.autoSubmitted ?? '').trim().toLowerCase();
  if (autoSubmitted.startsWith('auto-replied')) return true;
  if ((mail.xAutoreply ?? '').trim()) return true;
  if ((mail.xAutorespond ?? '').trim()) return true;
  if ((mail.inReplyTo ?? '').trim()) return true;
  return REPLY_SUBJECT.test(mail.subject ?? '');
}

export function isSentMailOnly(mail: { labelIds?: string[] | null }): boolean {
  const labels = mail.labelIds ?? [];
  return labels.includes('SENT') && !labels.includes('INBOX');
}
