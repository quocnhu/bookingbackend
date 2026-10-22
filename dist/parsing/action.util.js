"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAction = detectAction;
exports.emailBodyText = emailBodyText;
const cancellation_util_1 = require("./cancellation.util");
const amendment_util_1 = require("./amendment.util");
function detectAction(subject, body) {
    const cleanSubject = (0, cancellation_util_1.stripPolicyPhrases)(subject ?? '');
    if ((0, cancellation_util_1.isCancellationSubject)(cleanSubject))
        return 'CANCEL';
    if (body && (0, cancellation_util_1.isCancellationBody)(body))
        return 'CANCEL';
    if ((0, amendment_util_1.isAmendmentSubject)(cleanSubject))
        return 'MODIFY';
    if (body && (0, amendment_util_1.isAmendmentBody)(body))
        return 'MODIFY';
    return 'CREATE';
}
function emailBodyText(payload) {
    const parts = [payload?.body, payload?.snippet];
    return parts
        .map((p) => (typeof p === 'string' ? p : ''))
        .filter((p) => p.trim() !== '')
        .join('\n');
}
//# sourceMappingURL=action.util.js.map