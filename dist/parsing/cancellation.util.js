"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripPolicyPhrases = stripPolicyPhrases;
exports.isCancellationSubject = isCancellationSubject;
exports.isCancellationBody = isCancellationBody;
const POLICY_PHRASES = /\bfree\s+cancel(?:lation|ation)?(?:\s+until|\s+from|\s+on|\s+before|\s+after)?\b|\bcancell?ation\s+polic(?:y|ies)\b|\brefund\s+polic(?:y|ies)\b|\bfaqs?\b|\bcancell?ation\s+(?:deadline|window|period|fees?|charges?|terms?|rules?|conditions?|options?|dates?|rate)\b|\bhow\s+to\s+cancel\b|\bcan\s+i\s+cancel\b|\bto\s+cancel\s+this\b/gi;
const SUBJECT_CANCEL = /\b(cancel|cancelled|canceled|cancellation|refunds?|refund|refunded)\b/i;
const STRONG_BODY_CANCEL = /\b(?:has\s+been|was|been|now)\s+(?:cancelled|canceled)\b|\b(?:we|host|supplier|provider)\s+(?:have\s+|has\s+)?(?:just\s+)?(?:cancelled|canceled)\b|\b(?:cancelled|canceled)\s+(?:your|this)\s+(?:booking|reservation|order|tour|activity)\b|\bcancell?ation\s+(?:confirmation|confirmed|is\s+confirmed|complete|completed|successful)\b|\bcancell?ation\s+request\s+has\s+been\s+(?:completed|processed|fulfilled)\b|\brefund\s+(?:issued|processed|confirmation|has\s+been\s+issued|of\s+your)\b|\b(?:issued|processed)\s+(?:a\s+)?refund\b|\byou\s+won'?t\s+be\s+going\b/i;
function stripPolicyPhrases(text) {
    return text.replace(POLICY_PHRASES, ' ');
}
function isCancellationSubject(subject) {
    return SUBJECT_CANCEL.test(stripPolicyPhrases(subject));
}
function isCancellationBody(body) {
    return STRONG_BODY_CANCEL.test(body);
}
//# sourceMappingURL=cancellation.util.js.map