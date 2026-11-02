"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isResponseEmail = isResponseEmail;
exports.isSentMailOnly = isSentMailOnly;
const REPLY_SUBJECT = /^\s*(re|aw|sv|res|odp)\s*:/i;
function isResponseEmail(mail) {
    const autoSubmitted = (mail.autoSubmitted ?? '').trim().toLowerCase();
    if (autoSubmitted.startsWith('auto-replied'))
        return true;
    if ((mail.xAutoreply ?? '').trim())
        return true;
    if ((mail.xAutorespond ?? '').trim())
        return true;
    if ((mail.inReplyTo ?? '').trim())
        return true;
    return REPLY_SUBJECT.test(mail.subject ?? '');
}
function isSentMailOnly(mail) {
    const labels = mail.labelIds ?? [];
    return labels.includes('SENT') && !labels.includes('INBOX');
}
//# sourceMappingURL=response-mail.util.js.map