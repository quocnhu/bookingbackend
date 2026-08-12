"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingComParser = void 0;
const common_1 = require("@nestjs/common");
const TEN_DIGIT_REF = /\b(\d{10})\b/;
const DATE_PAIR_RE = /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4})/gi;
const asString = (value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
let BookingComParser = class BookingComParser {
    templateTag = 'booking-com';
    canParse(payload) {
        const from = asString(payload.from).toLowerCase();
        const subject = asString(payload.subject).toLowerCase();
        return (from.includes('booking.com') ||
            subject.includes('booking.com') ||
            subject.includes('booking confirmation') ||
            subject.includes('your booking'));
    }
    extract(payload) {
        const body = `${asString(payload.subject)}\n${asString(payload.body)}\n${asString(payload.snippet)}`;
        const ref = this.matchRef(body);
        if (!ref)
            return null;
        const dates = this.matchDates(body);
        if (!dates.startingDate)
            return null;
        return {
            action: this.isCancellation(body) ? 'CANCEL' : 'CREATE',
            bookingRef: ref,
            source: 'booking-com',
            customerName: this.matchGuest(body),
            startingDate: dates.startingDate,
            totalPax: this.matchPax(body),
            hotelName: this.matchHotel(body),
            address: this.matchAddress(body),
            mail: asString(payload.emailAddress) || undefined,
        };
    }
    matchRef(body) {
        const m = /\b(?:reservation|booking|reference|pin|confirmation)\s*[#:]?\s*(\d{10})\b/i.exec(body) ?? TEN_DIGIT_REF.exec(body);
        return m ? m[1] : null;
    }
    isCancellation(body) {
        return /\b(cancel(?:led|lation)?|refund(?:ed)?)\b/i.test(body);
    }
    matchGuest(body) {
        const m = /\b(?:guest|lead guest name|traveller name|name)\s*[:-]\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/.exec(body) ?? /Hi\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?),/.exec(body);
        return m ? m[1].trim() : undefined;
    }
    matchDates(body) {
        const all = body.match(DATE_PAIR_RE) ?? [];
        const normalized = all.map((d) => {
            const date = new Date(d);
            return Number.isNaN(date.getTime()) ? d : date.toISOString();
        });
        const checkIn = /\bcheck[- ]?in\b[:\s]*([A-Z][a-z]+ \d{1,2},? \d{4})/i.exec(body);
        return {
            startingDate: checkIn ? this.normalize(checkIn[1]) : normalized[0],
        };
    }
    matchPax(body) {
        const m = /(\d+)\s*(?:adult|guest|traveller|traveler)s?\b/i.exec(body);
        return m ? Number(m[1]) : undefined;
    }
    matchHotel(body) {
        const m = /\b(?:hotel|property|accommodation)\b[:\s]*\n?\s*([^\n]{3,80})/.exec(body);
        return m ? m[1].trim() : undefined;
    }
    matchAddress(body) {
        const m = /\b(?:address|location)\b[:\s]*\n?\s*([^\n]{5,90})/.exec(body);
        return m ? m[1].trim() : undefined;
    }
    normalize(raw) {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? raw : d.toISOString();
    }
};
exports.BookingComParser = BookingComParser;
exports.BookingComParser = BookingComParser = __decorate([
    (0, common_1.Injectable)()
], BookingComParser);
//# sourceMappingURL=booking-com.parser.js.map