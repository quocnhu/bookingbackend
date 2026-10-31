"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailFromHeader = emailFromHeader;
const EMAIL_RE = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
function emailFromHeader(value) {
    if (typeof value !== 'string')
        return undefined;
    const first = value.split(',')[0]?.trim();
    if (!first)
        return undefined;
    const bracketed = /<([^<>]+)>/.exec(first);
    const candidate = (bracketed?.[1] ?? first)
        .trim()
        .replace(/^mailto:/i, '');
    return EMAIL_RE.test(candidate) ? candidate : undefined;
}
//# sourceMappingURL=email.util.js.map