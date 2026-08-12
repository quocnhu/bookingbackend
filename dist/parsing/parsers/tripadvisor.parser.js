"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripAdvisorParser = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const cheerio_1 = require("cheerio");
const asString = (value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
let TripAdvisorParser = class TripAdvisorParser {
    templateTag = 'tripadvisor';
    canParse(payload) {
        const from = asString(payload.from).toLowerCase();
        const subject = asString(payload.subject).toLowerCase();
        const html = asString(payload.html);
        const body = asString(payload.body);
        const hasParsedBooking = Boolean(payload.booking ?? payload.parsedBooking);
        return (from.includes('tripadvisor.com') ||
            subject.includes('tripadvisor') ||
            /\bBooking Ref\.?/i.test(html) ||
            /\bBooking Ref\.?/i.test(body) ||
            (hasParsedBooking &&
                (asString(payload.source).includes('tripadvisor') ||
                    asString(payload.channel).toUpperCase() === 'TRIPADVISOR')));
    }
    extract(payload) {
        const html = asString(payload.html);
        const body = asString(payload.body);
        if (/\bBooking Ref\.?/i.test(html) || /\bBooking Ref\.?/i.test(body)) {
            const rows = this.parseRows(html || body);
            if (rows.size > 0)
                return this.buildFromRows(rows, payload);
        }
        if (payload.booking ?? payload.parsedBooking) {
            return this.buildFromJson(payload);
        }
        return null;
    }
    parseRows(raw) {
        const rows = new Map();
        const text = raw.replace(/<br\s*\/?>/gi, '\n');
        try {
            if (text.includes('<')) {
                const $ = (0, cheerio_1.load)(text);
                $('tr').each((_, tr) => {
                    const cells = $(tr)
                        .find('td, th')
                        .map((_, td) => $(td).text().trim())
                        .get();
                    if (cells.length >= 2)
                        this.setRow(rows, cells[0], cells.slice(1).join(' '));
                });
                if (rows.size > 0)
                    return rows;
            }
        }
        catch {
        }
        const re = /([A-Za-z][A-Za-z .-]{2,40}?):\s*(.*)$/gm;
        let m;
        while ((m = re.exec(text)) !== null) {
            const label = m[1].trim();
            const value = m[2].trim();
            if (label && value && this.isKnownLabel(label))
                this.setRow(rows, label, value);
        }
        return rows;
    }
    isKnownLabel(label) {
        const known = [
            'booking ref',
            'product booking ref',
            'ext booking ref',
            'product',
            'supplier',
            'sold by',
            'booking channel',
            'customer',
            'customer email',
            'customer phone',
            'date',
            'rate',
            'pax',
            'pick-up',
            'guided languages',
            'notes',
            'extras',
            'created',
        ];
        const normalized = label.toLowerCase().replace(/\.+$/, '');
        return known.some((k) => normalized.includes(k));
    }
    setRow(rows, label, value) {
        const normalized = label.toLowerCase().replace(/\.+$/, '').trim();
        const keys = [
            ['booking ref', 'bookingRef'],
            ['product booking ref', 'productBookingRef'],
            ['ext booking ref', 'extBookingRef'],
            ['product', 'product'],
            ['supplier', 'supplier'],
            ['sold by', 'soldBy'],
            ['booking channel', 'bookingChannel'],
            ['customer email', 'customerEmail'],
            ['customer phone', 'customerPhone'],
            ['guided languages', 'guidedLanguages'],
            ['pick-up', 'pickUp'],
            ['booking languages', 'bookingLanguages'],
            ['customer', 'customer'],
            ['date', 'date'],
            ['rate', 'rate'],
            ['pax', 'pax'],
            ['notes', 'notes'],
            ['extras', 'extras'],
            ['created', 'created'],
        ];
        for (const [key, field] of keys) {
            if (normalized.startsWith(key)) {
                const current = rows.get(field);
                rows.set(field, current ? `${current}\n${value}` : value);
                return;
            }
        }
    }
    buildFromRows(rows, payload) {
        const bookingRef = rows.get('bookingRef') ?? rows.get('productBookingRef');
        if (!bookingRef)
            return null;
        const rate = rows.get('rate') ?? '';
        const product = rows.get('product') ?? '';
        const pickUp = this.splitPickUp(rows.get('pickUp'));
        const subject = asString(payload.subject);
        return {
            action: /\b(cancel(?:led|lation)?|refund(?:ed)?)\b/i.test(subject)
                ? 'CANCEL'
                : 'CREATE',
            bookingRef,
            source: 'tripadvisor',
            channel: client_1.BookingProvider.TRIPADVISOR,
            customerName: rows.get('customer') || undefined,
            mail: rows.get('customerEmail') ||
                asString(payload.emailAddress) ||
                undefined,
            phone: rows.get('customerPhone') || undefined,
            tourName: product || undefined,
            tourType: this.detectTourType(rate, product),
            startingDate: this.normalizeDate(rows.get('date')),
            totalPax: this.sumPax(rows.get('pax')),
            paxDetail: rows.get('pax') || undefined,
            hotelName: pickUp.hotel,
            address: pickUp.address,
        };
    }
    buildFromJson(payload) {
        const b = (payload.booking ?? payload.parsedBooking ?? {});
        const bookingRef = asString(b.bookingRef) || asString(payload.bookingRef);
        if (!bookingRef)
            return null;
        const rate = asString(b.rate);
        const product = asString(b.product ?? b.tourName ?? b.tour);
        const pickUp = this.splitPickUp(asString(b.pickUp));
        const subject = asString(payload.subject);
        return {
            action: /\b(cancel(?:led|lation)?|refund(?:ed)?)\b/i.test(subject)
                ? 'CANCEL'
                : 'CREATE',
            bookingRef,
            source: 'tripadvisor',
            channel: client_1.BookingProvider.TRIPADVISOR,
            customerName: asString(b.customer ?? b.customerName) || undefined,
            mail: asString(b.customerEmail ?? b.mail) ||
                asString(payload.emailAddress) ||
                undefined,
            phone: asString(b.customerPhone ?? b.phone) || undefined,
            tourName: product || undefined,
            tourType: this.detectTourType(rate, product),
            startingDate: this.normalizeDate(asString(b.date ?? b.startingDate)),
            totalPax: this.sumPax(asString(b.pax ?? b.paxTotal)),
            paxDetail: asString(b.pax ?? b.paxDetail) || undefined,
            hotelName: pickUp.hotel,
            address: pickUp.address,
        };
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
    sumPax(raw) {
        if (!raw)
            return undefined;
        const matches = raw.matchAll(/(\d+)\s*(?:adult|child|infant|pax)s?/gi);
        let total = 0;
        let found = false;
        for (const m of matches) {
            total += Number(m[1]);
            found = true;
        }
        return found ? total : undefined;
    }
    detectTourType(rate, product) {
        const text = `${rate} ${product}`.toLowerCase();
        if (/\b(private|solo|exclusive)\b/.test(text))
            return client_1.TourType.PRIVATE_TOUR;
        if (/\b(shared|group|max)\b/.test(text))
            return client_1.TourType.GROUP_TOUR;
        return undefined;
    }
    normalizeDate(raw) {
        if (!raw)
            return undefined;
        const value = raw.trim();
        const m = /(\d{1,2})\.([A-Za-z]{2,})[^@]*?'?(\d{2})?\s*@?\s*(\d{1,2}):(\d{2})/.exec(value);
        if (m) {
            const day = Number(m[1]);
            const month = this.monthIndex(m[2]);
            const yy = m[3] ? Number(m[3]) : undefined;
            const year = yy != null ? (yy < 100 ? 2000 + yy : yy) : undefined;
            const hour = Number(m[4]);
            const minute = Number(m[5]);
            if (month != null && year != null) {
                const date = new Date(year, month, day, hour, minute);
                if (!Number.isNaN(date.getTime()))
                    return date.toISOString();
            }
        }
        const plain = new Date(value);
        return Number.isNaN(plain.getTime()) ? undefined : plain.toISOString();
    }
    monthIndex(name) {
        const months = [
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
        const index = months.indexOf(name.toLowerCase().slice(0, 3));
        return index === -1 ? undefined : index;
    }
};
exports.TripAdvisorParser = TripAdvisorParser;
exports.TripAdvisorParser = TripAdvisorParser = __decorate([
    (0, common_1.Injectable)()
], TripAdvisorParser);
//# sourceMappingURL=tripadvisor.parser.js.map