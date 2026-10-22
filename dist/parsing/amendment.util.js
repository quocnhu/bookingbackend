"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAmendmentSubject = isAmendmentSubject;
exports.isAmendmentBody = isAmendmentBody;
const BOOKING_NOUN = 'booking details|reservation details|booking|reservation|itinerary|order|trip';
const CHANGE_VERBS = 'amended|amendment|modified|modification|updated|update|changed|change|revised|revision|corrected|correction';
const NOUN_THEN_VERB = new RegExp(`\\b(?:${BOOKING_NOUN})\\b[^.!?\\n]{0,25}?\\b(?:has|have|had|was|were|is|are)\\s+(?:been\\s+)?(?:${CHANGE_VERBS})\\b`, 'i');
const CHANGE_TO_NOUN = new RegExp(`\\b(?:changes?|updates?|modifications?|amendments?|corrections?|revisions?)\\s+(?:to|in|of|for|regarding|about)\\s+(?:your|the|this)\\s+(?:${BOOKING_NOUN})\\b`, 'i');
const NOUN_CHANGE = new RegExp(`\\b(?:${BOOKING_NOUN})\\s+(?:${CHANGE_VERBS})\\b`, 'i');
const VERB_NOUN = new RegExp(`\\b(?:amended|modified|updated|revised|corrected)\\s+(?:${BOOKING_NOUN})\\b`, 'i');
const WE_CHANGED_NOUN = new RegExp(`\\b(?:we|our\\s+team|the\\s+supplier|the\\s+operator|the\\s+host|the\\s+provider|the\\s+merchant)\\s+(?:have\\s+|has\\s+)?(?:just\\s+)?(?:${CHANGE_VERBS})\\s+(?:your|the|this)\\s+(?:${BOOKING_NOUN})\\b`, 'i');
const CHANGES_MADE = new RegExp(`\\bchanges?\\s+(?:have|has|were|was)\\s+(?:been\\s+)?made\\s+to\\s+(?:your|the|this)\\s+(?:${BOOKING_NOUN})\\b`, 'i');
const SUBJECT_PATTERNS = [
    NOUN_THEN_VERB,
    CHANGE_TO_NOUN,
    NOUN_CHANGE,
    VERB_NOUN,
];
const BODY_PATTERNS = [
    ...SUBJECT_PATTERNS,
    WE_CHANGED_NOUN,
    CHANGES_MADE,
];
function isAmendmentSubject(subject) {
    return SUBJECT_PATTERNS.some((re) => re.test(subject));
}
function isAmendmentBody(body) {
    return BODY_PATTERNS.some((re) => re.test(body));
}
//# sourceMappingURL=amendment.util.js.map