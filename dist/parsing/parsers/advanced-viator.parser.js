"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedViatorParser = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const action_util_1 = require("../action.util");
const channel_util_1 = require("../channel.util");
const extra_util_1 = require("../extra.util");
const template_util_1 = require("../template.util");
const asString = (value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const MONTHS = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
];
let AdvancedViatorParser = class AdvancedViatorParser {
    templateTag = 'advancedViator';
    canParse(payload) {
        const text = this.flatten(payload);
        const subject = asString(payload.subject);
        const from = asString(payload.from);
        const hasDetails = /lead traveler\s*:/i.test(text) && /product option\s*:/i.test(text);
        const hasRef = /booking reference\s*:/i.test(text) || /\bBR-?\d{4,}\b/i.test(text);
        if (!hasRef)
            return false;
        if (hasDetails)
            return true;
        if (/conversation with\b/i.test(subject) && /booking details/i.test(text)) {
            return true;
        }
        if (this.isMessageCentre(from) && this.isStateChange(subject, text)) {
            return true;
        }
        return false;
    }
    extract(payload) {
        const text = this.flatten(payload);
        if (!text.trim())
            return null;
        const labels = this.readLabels(text);
        const subject = asString(payload.subject);
        const action = (0, action_util_1.detectAction)(subject, text);
        const bookingRef = this.bookingRef(subject, text, labels);
        if (!bookingRef)
            return null;
        const product = labels.get('product name') ?? '';
        const productOption = labels.get('product option') ?? '';
        const travel = this.travelLine(labels.get('travel date/pax'));
        const pickUp = this.splitPickUp(labels.get('pickup point'));
        const customerMessage = this.customerMessage(text);
        const leadTraveler = labels.get('lead traveler');
        const customerName = leadTraveler ||
            (action === 'CREATE' ? this.fromSalutation(subject) : undefined) ||
            undefined;
        const phone = labels.get('phone number') || undefined;
        const mail = this.customerMail(text, payload);
        const startingDate = this.startingDate(travel.date, {
            productOption,
            customerMessage,
            mailDate: asString(payload.date),
        });
        const totalPax = this.sumPax(travel.pax);
        const paxDetail = travel.pax || undefined;
        const fields = {
            action,
            bookingRef,
            source: 'viator',
            channel: (0, channel_util_1.resolveBookingChannel)(product, productOption, payload.from) ??
                client_1.BookingProvider.VIATOR,
            customerName,
            mail: mail.address,
            phone,
            tourName: product || undefined,
            tourType: this.detectTourType(productOption, product),
            startingDate,
            totalPax,
            paxDetail,
            hotelName: pickUp.hotel,
            address: pickUp.address,
        };
        const rich = {
            provider: 'viator',
            template: this.templateTag,
            productName: product || null,
            productOption: productOption || null,
            bookingRef,
            leadTraveler: labels.get('lead traveler') ?? null,
            phoneNumber: phone ?? null,
            travelDatePax: labels.get('travel date/pax') ?? null,
            pickupPoint: labels.get('pickup point') ?? null,
            customerMessage: customerMessage || null,
            whatsapp: this.whatsapp(customerMessage) ?? null,
            customerEmail: mail.address ?? null,
            mailSource: mail.isRelay ? 'thread-relay' : 'customer',
            conversationFrom: this.addressFrom(asString(payload.from)) ?? null,
            viatorBookingId: this.viatorBookingId(text) ?? null,
            viatorRef: this.viatorRef(text) ?? null,
            mailDate: asString(payload.date) || null,
            tourType: fields.tourType ?? 'UNKNOWN',
            startingDate: fields.startingDate ?? null,
            paxTotal: fields.totalPax ?? null,
        };
        payload.booking = rich;
        fields.extra = (0, extra_util_1.buildExtra)(rich);
        return fields;
    }
    isMessageCentre(from) {
        if (from.toLowerCase().includes('expmessaging.tripadvisor.com')) {
            return true;
        }
        return (0, template_util_1.isRoutedToTag)({ from, subject: '' }, 'advancedViator');
    }
    isStateChange(subject, text) {
        return (0, action_util_1.detectAction)(subject, text) !== 'CREATE';
    }
    flatten(payload) {
        const parts = [
            asString(payload.body),
            asString(payload.snippet),
            this.htmlToText(asString(payload.html)),
        ];
        return parts.filter((p) => p.trim() !== '').join('\n');
    }
    htmlToText(html) {
        if (!html)
            return '';
        return html
            .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    readLabels(text) {
        const out = new Map();
        for (const rawLine of text.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line)
                continue;
            const m = /^([A-Za-z][A-Za-z0-9 /()_-]{0,40}):\s*(.+)$/.exec(line);
            if (!m)
                continue;
            const label = m[1].trim().toLowerCase();
            const value = m[2].trim().replace(/\.$/, '');
            if (!value)
                continue;
            out.set(label, value);
        }
        return out;
    }
    bookingRef(subject, text, labels) {
        const fromLabel = labels.get('booking reference');
        if (fromLabel) {
            const m = /(BR-?\d+)/i.exec(fromLabel);
            if (m)
                return m[1].toUpperCase();
        }
        const m = /\b(BR-?\d+)\b/i.exec(subject) ?? /\b(BR-?\d+)\b/i.exec(text);
        return m ? m[1].toUpperCase() : undefined;
    }
    travelLine(raw) {
        if (!raw)
            return {};
        const parts = raw.split(/\s+-\s+/);
        const date = parts[0]?.trim() || undefined;
        const pax = parts.slice(1).join(' - ').trim() || undefined;
        return { date, pax };
    }
    sumPax(raw) {
        if (!raw)
            return undefined;
        const matches = raw.matchAll(/(\d+)\s*(?:adult|child|infant|pax|person|people)s?/gi);
        let total = 0;
        let found = false;
        for (const m of matches) {
            total += Number(m[1]);
            found = true;
        }
        return found ? total : undefined;
    }
    splitPickUp(raw) {
        const value = raw?.trim();
        if (!value)
            return {};
        const comma = value.indexOf(',');
        if (comma === -1)
            return { hotel: value };
        const hotel = value.slice(0, comma).trim();
        const address = value.slice(comma + 1).trim();
        return hotel ? { hotel, address } : { address };
    }
    detectTourType(productOption, product) {
        const text = `${productOption} ${product}`.toLowerCase();
        if (/\b(private|solo|exclusive)\b/.test(text))
            return client_1.TourType.PRIVATE_TOUR;
        if (/\b(shared|group|max)\b/.test(text))
            return client_1.TourType.GROUP_TOUR;
        return undefined;
    }
    startingDate(dateRaw, ctx) {
        const time = this.time(ctx.productOption) ?? this.time(ctx.customerMessage);
        const day = this.parseDate(dateRaw, ctx.mailDate);
        if (!day)
            return undefined;
        const naive = `${day}T${time ?? '00:00'}:00`;
        const parsed = new Date(`${naive}+07:00`);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }
    parseDate(raw, mailDate) {
        if (raw) {
            const m = /([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/.exec(raw);
            if (m) {
                const month = this.monthIndex(m[1]);
                const year = m[3] ? Number(m[3]) : this.yearFrom(mailDate);
                if (month != null && year != null) {
                    return `${year}-${String(month + 1).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
                }
            }
        }
        return undefined;
    }
    time(raw) {
        if (!raw)
            return undefined;
        const m = /(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(raw);
        if (!m)
            return undefined;
        let hour = Number(m[1]);
        const minute = Number(m[2]);
        const meridiem = m[3]?.toLowerCase();
        if (meridiem === 'pm' && hour < 12)
            hour += 12;
        if (meridiem === 'am' && hour === 12)
            hour = 0;
        if (hour > 23 || minute > 59)
            return undefined;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    yearFrom(mailDate) {
        if (!mailDate)
            return undefined;
        const m = /(\d{4})/.exec(mailDate);
        if (!m)
            return undefined;
        const year = Number(m[1]);
        return year > 1970 && year < 3000 ? year : undefined;
    }
    monthIndex(name) {
        const idx = MONTHS.indexOf(name.trim().slice(0, 3).toLowerCase());
        return idx === -1 ? undefined : idx;
    }
    customerMessage(text) {
        const start = text.indexOf('wrote:');
        if (start === -1)
            return '';
        const rest = text.slice(start + 'wrote:'.length);
        const end = rest.search(/booking details/i);
        return (end === -1 ? rest : rest.slice(0, end)).trim();
    }
    whatsapp(message) {
        const m = /whatsapp[^\d+]*(\+?\d[\d\s().-]*\d)/i.exec(message);
        return m ? m[1].trim() : undefined;
    }
    viatorBookingId(text) {
        const m = /\bbooking\s+(\d{6,})\b/i.exec(text);
        return m ? m[1] : undefined;
    }
    viatorRef(text) {
        const m = /\bref\s+(\d{6,})\b/i.exec(text);
        return m ? m[1] : undefined;
    }
    fromSalutation(subject) {
        const m = /^conversation with\s+(.+?)(?:\s+about\b|\s+re\b|$)/i.exec(subject.trim());
        return m ? m[1].trim() : undefined;
    }
    customerMail(text, payload) {
        const relay = this.addressFrom(asString(payload.from));
        const mailbox = asString(payload.emailAddress);
        const mentioned = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
        for (const mail of mentioned ?? []) {
            const lower = mail.toLowerCase();
            if (lower === relay?.toLowerCase() || lower === mailbox.toLowerCase())
                continue;
            if (this.isMessageCentre(mail))
                continue;
            return { address: mail, isRelay: false };
        }
        return {
            address: relay || (mailbox ? mailbox : undefined),
            isRelay: true,
        };
    }
    addressFrom(from) {
        const m = /<([^>]+)>/.exec(from);
        const address = (m ? m[1] : from).trim();
        return address.includes('@') ? address : undefined;
    }
};
exports.AdvancedViatorParser = AdvancedViatorParser;
exports.AdvancedViatorParser = AdvancedViatorParser = __decorate([
    (0, common_1.Injectable)()
], AdvancedViatorParser);
//# sourceMappingURL=advanced-viator.parser.js.map