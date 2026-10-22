"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTemplateRules = parseTemplateRules;
exports.matchTemplateRule = matchTemplateRule;
exports.defaultTemplateTag = defaultTemplateTag;
exports.isRoutedToTag = isRoutedToTag;
exports.resolveTemplateTag = resolveTemplateTag;
function parseTemplateRules(raw) {
    if (!raw)
        return [];
    const rules = [];
    for (const chunk of raw.split(/[,;\n]+/)) {
        const entry = chunk.trim();
        if (!entry)
            continue;
        const eq = entry.indexOf('=');
        if (eq === -1)
            continue;
        const left = entry.slice(0, eq).trim();
        const tag = entry.slice(eq + 1).trim();
        if (!left || !tag)
            continue;
        let field = 'any';
        let prefix = left;
        const colon = left.indexOf(':');
        if (colon > 0) {
            const maybeField = left.slice(0, colon).trim().toLowerCase();
            if (maybeField === 'subject' ||
                maybeField === 'from' ||
                maybeField === 'any') {
                field = maybeField;
                prefix = left.slice(colon + 1).trim();
            }
        }
        if (!prefix)
            continue;
        rules.push({ field, prefix: prefix.toLowerCase(), tag });
    }
    return rules;
}
function addressPart(from) {
    const m = /<([^>]+)>/.exec(from);
    return (m ? m[1] : from).trim().toLowerCase();
}
function matchTemplateRule(rules, headers) {
    const subject = (headers.subject ?? '').trim().toLowerCase();
    const from = (headers.from ?? '').trim().toLowerCase();
    const fromAddress = addressPart(from);
    for (const rule of rules) {
        if (rule.field === 'subject' || rule.field === 'any') {
            if (subject.startsWith(rule.prefix))
                return rule.tag;
        }
        if (rule.field === 'from' || rule.field === 'any') {
            if (from.startsWith(rule.prefix))
                return rule.tag;
            if (fromAddress.startsWith(rule.prefix))
                return rule.tag;
            if (fromAddress.endsWith(`@${rule.prefix}`))
                return rule.tag;
            if (fromAddress.endsWith(`.${rule.prefix}`))
                return rule.tag;
        }
    }
    return undefined;
}
function defaultTemplateTag(fromRaw, subjectRaw) {
    const from = (fromRaw ?? '').toLowerCase();
    const subject = (subjectRaw ?? '').toLowerCase();
    let tag = 'unknown';
    if (from.includes('airbnb.com'))
        tag = 'airbnb';
    else if (from.includes('booking.com') || from.includes('@booking.com'))
        tag = 'booking-com';
    else if (from.includes('getyourguide.com') ||
        subject.includes('getyourguide'))
        tag = 'getyourguide';
    else if (from.includes('viator.com') ||
        from.includes('tripadvisor.com') ||
        from.includes('bokun.io') ||
        subject.includes('viator') ||
        subject.includes('tripadvisor'))
        tag = 'viator';
    else if (/booking|reservation|confirmation|trip to/i.test(subject))
        tag = 'website';
    return tag;
}
function isRoutedToTag(headers, tag) {
    return (matchTemplateRule(parseTemplateRules(process.env.MAIL_TEMPLATE_PREFIX_RULES), headers) === tag);
}
function resolveTemplateTag(headers, rules = []) {
    return (matchTemplateRule(rules, headers) ??
        defaultTemplateTag(headers.from, headers.subject));
}
//# sourceMappingURL=template.util.js.map