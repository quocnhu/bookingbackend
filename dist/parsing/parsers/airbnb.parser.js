"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirbnbParser = void 0;
const common_1 = require("@nestjs/common");
const DATE_RE = /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{4})\b/i;
const REF_RE = /(?:confirmation|reservation|booking|reservation code|confirmation code|itinerary)\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,19})/i;
const asString = (value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
let AirbnbParser = class AirbnbParser {
    templateTag = 'airbnb';
    canParse(payload) {
        const from = asString(payload.from).toLowerCase();
        const subject = asString(payload.subject).toLowerCase();
        return (from.includes('airbnb.com') ||
            subject.includes('airbnb') ||
            subject.includes('trip to') ||
            subject.includes('reservation confirmed'));
    }
    extract(payload) {
        const body = `${asString(payload.subject)}\n${asString(payload.body)}\n${asString(payload.snippet)}`;
        const ref = this.matchRef(body);
        if (!ref)
            return null;
        const start = this.matchStartDate(body);
        const end = this.matchEndDate(body);
        if (!start && !end)
            return null;
        return {
            action: this.isCancellation(body) ? 'CANCEL' : 'CREATE',
            bookingRef: ref,
            source: 'airbnb',
            customerName: this.matchGuest(body),
            startingDate: start ?? end,
            totalPax: this.matchPax(body),
            address: this.matchAddress(body),
            mail: asString(payload.emailAddress) || undefined,
            phone: this.matchPhone(body),
        };
    }
    matchRef(body) {
        const m = REF_RE.exec(body);
        if (m)
            return this.cleanRef(m[1]);
        const hm = /(?:HM|RT)[A-Z0-9]{6,8}/i.exec(body);
        return hm ? hm[0].toUpperCase() : null;
    }
    cleanRef(ref) {
        return ref
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 20);
    }
    isCancellation(body) {
        return /\b(cancel(?:led|lation)?|refund(?:ed)?|you won'?t be going)\b/i.test(body);
    }
    matchGuest(body) {
        const m = /\b(?:guest|lead guest|traveler)\s*[:#-]\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/.exec(body) ?? /Hi\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?),/.exec(body);
        return m ? m[1].trim() : undefined;
    }
    matchStartDate(body) {
        const m = /\bcheck[- ]?in\b[:\s]*([A-Z][a-z]+ \d{1,2},? \d{4})/i.exec(body) ??
            DATE_RE.exec(body);
        return m ? this.normalizeDate(m[1]) : undefined;
    }
    matchEndDate(body) {
        const m = /\bcheck[- ]?out\b[:\s]*([A-Z][a-z]+ \d{1,2},? \d{4})/i.exec(body);
        return m ? this.normalizeDate(m[1]) : undefined;
    }
    matchPax(body) {
        const m = /(\d+)\s*(?:adult|guest|traveler|traveller)s?\b/i.exec(body);
        return m ? Number(m[1]) : undefined;
    }
    matchAddress(body) {
        const m = /\b(?:where you'?ll be|address|location)\b[:\s]*\n?\s*(.{5,90})/.exec(body);
        return m ? m[1].replace(/\s+/g, ' ').trim() : undefined;
    }
    matchPhone(body) {
        const m = /\b(\+?\d[\d\s().-]{8,17}\d)\b/.exec(body);
        return m ? m[1].replace(/[\s().-]/g, '') : undefined;
    }
    normalizeDate(raw) {
        const d = new Date(raw + '+07:00');
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }
};
exports.AirbnbParser = AirbnbParser;
exports.AirbnbParser = AirbnbParser = __decorate([
    (0, common_1.Injectable)()
], AirbnbParser);
//# sourceMappingURL=airbnb.parser.js.map