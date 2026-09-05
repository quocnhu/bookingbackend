"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteParser = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const cheerio_1 = require("cheerio");
const booking_normalizer_service_1 = require("../booking-normalizer.service");
const asString = (value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const collapse = (value) => value.replace(/\s+/g, ' ').trim();
let WebsiteParser = class WebsiteParser {
    normalizer;
    templateTag = 'website';
    constructor(normalizer) {
        this.normalizer = normalizer;
    }
    canParse(payload) {
        const from = asString(payload.from).toLowerCase();
        const subject = asString(payload.subject).toLowerCase();
        const text = `${asString(payload.html)}\n${asString(payload.body)}`;
        const hasBooking = Boolean(payload.booking ?? payload.parsedBooking);
        if (hasBooking) {
            const rawSource = payload.source ?? payload.templateTag;
            const source = typeof rawSource === 'string' ? rawSource.toLowerCase() : '';
            if (source === 'website' || source === '' || source === 'unknown')
                return true;
        }
        return (from.includes('nquocnhu95book@gmail.com') ||
            subject.includes('new booking') ||
            /wptravelengine|wp travel engine/i.test(text) ||
            text.includes('Billing Details') ||
            /\bwp-admin\/post\.php\?post=\d+/i.test(text));
    }
    extract(payload) {
        const html = asString(payload.html);
        const body = asString(payload.body);
        const text = html || body;
        const rich = this.parseHtml(text, payload);
        if (rich) {
            payload.booking = rich;
            return this.toFields(rich, payload);
        }
        const result = this.normalizer.normalize(payload, 'website');
        return result.clean ? result.data : null;
    }
    parseHtml(raw, payload) {
        if (!raw || !raw.trim())
            return null;
        const text = raw.replace(/<br\s*\/?>/gi, '\n');
        const isHtml = text.includes('<');
        const rows = new Map();
        const priceLinesParts = [];
        let tourName = null;
        let bookingLink = null;
        if (isHtml) {
            const $ = (0, cheerio_1.load)(text);
            tourName = $('td b').first().text().replace(/\s+/g, ' ').trim() || null;
            bookingLink =
                $('a[href*="wp-admin"][href*="action=edit"]').attr('href') || null;
            $('tr').each((_, row) => {
                const cells = $(row)
                    .find('td, th')
                    .map((_, td) => $(td).text().replace(/\s+/g, ' ').trim())
                    .get();
                if (cells.length < 2)
                    return;
                const key = cells[0].trim();
                const val = cells.slice(1).join(' ').trim();
                this.captureRow(rows, priceLinesParts, key, val);
            });
        }
        else {
            const linkMatch = /(https?:\/\/[^\s]+wp-admin\/post\.php\?post=\d+[^\s]*)/i.exec(text);
            bookingLink = linkMatch ? linkMatch[1] : null;
            for (const line of text.split('\n')) {
                const m = /^([A-Za-z][A-Za-z ]{2,40}?):\s*(.*)$/.exec(line.trim());
                if (m)
                    this.captureRow(rows, priceLinesParts, m[1].trim(), m[2].trim());
            }
            const heading = /^(.{4,120})$/.exec(text.trim().split('\n')[0]);
            if (heading && !tourName)
                tourName = heading[1].trim();
        }
        const bookingRef = this.resolveBookingRef(bookingLink, payload);
        if (!bookingRef)
            return null;
        const tripDate = rows.get('tripDate') || null;
        const travellers = this.parseNumber(rows.get('travellers'));
        const subtotal = this.parseDollar(rows.get('subtotal'));
        const discount = this.parseDollar(rows.get('discount'));
        const total = this.parseDollar(rows.get('total'));
        const priceLines = priceLinesParts.length > 0 ? priceLinesParts.join(', ') : null;
        const billingName = rows.get('billingName') || null;
        const billingEmail = rows.get('billingEmail') || null;
        const billingAddress = rows.get('billingAddress') || null;
        const billingCity = rows.get('billingCity') || null;
        const billingCountry = rows.get('billingCountry') || null;
        const packageName = rows.get('packageName') || null;
        const tourType = this.detectTourType(packageName, tourName);
        const pickUp = this.splitPickUp(billingAddress);
        return {
            provider: 'website',
            bookingRef,
            tourName,
            packageName,
            tourType,
            tripDate,
            travellers,
            priceLines,
            subtotal,
            discount,
            totalcost: total,
            billingName,
            billingEmail,
            billingAddress,
            billingCity,
            billingCountry,
            pickUp: pickUp.hotel ?? null,
            pickUpAddress: pickUp.address ?? null,
            bookingLink,
        };
    }
    captureRow(rows, priceLinesParts, key, val) {
        const normalized = collapse(key);
        const value = collapse(val);
        const mapping = [
            ['package name', 'packageName'],
            ['trip date', 'tripDate'],
            ['travellers', 'travellers'],
            ['subtotal', 'subtotal'],
            ['discount', 'discount'],
            ['total', 'total'],
            ['billing address', 'billingAddress'],
            ['name', 'billingName'],
            ['email', 'billingEmail'],
            ['city', 'billingCity'],
            ['country', 'billingCountry'],
        ];
        for (const [needle, field] of mapping) {
            if (normalized.toLowerCase().includes(needle)) {
                rows.set(field, value);
                break;
            }
        }
        const priceMatch = /^(\d+)\s*[Xx]\s*\$([0-9.]+)\s*=\s*\$([0-9.]+)$/.exec(value);
        if (priceMatch && key && !normalized.toLowerCase().includes('subtotal')) {
            priceLinesParts.push(`${key}: ${priceMatch[1]}x$${priceMatch[2]}=$${priceMatch[3]}`);
        }
    }
    resolveBookingRef(bookingLink, payload) {
        if (bookingLink) {
            const postId = /post=(\d+)/.exec(bookingLink)?.[1];
            if (postId)
                return `WEB-${postId}`;
        }
        const stableId = asString(payload.threadId) || asString(payload.messageId);
        if (stableId)
            return `WEB-FALLBACK-${stableId}`;
        return null;
    }
    toFields(rich, payload) {
        const subject = asString(payload.subject);
        return {
            action: /\b(cancel(?:led|lation)?|refund(?:ed)?)\b/i.test(subject)
                ? 'CANCEL'
                : 'CREATE',
            bookingRef: rich.bookingRef,
            source: 'website',
            channel: client_1.BookingProvider.WEBSITE,
            customerName: rich.billingName || undefined,
            mail: rich.billingEmail || undefined,
            startingDate: this.normalizeDate(rich.tripDate),
            totalPax: rich.travellers ?? undefined,
            paxDetail: rich.priceLines || undefined,
            tourName: rich.tourName || undefined,
            tourType: rich.tourType === 'UNKNOWN' ? undefined : rich.tourType,
            hotelName: rich.pickUp || undefined,
            address: rich.pickUpAddress || rich.billingAddress || undefined,
        };
    }
    detectTourType(packageName, tourName) {
        const text = `${packageName ?? ''} ${tourName ?? ''}`.toLowerCase();
        if (/\b(private|solo|exclusive)\b/.test(text))
            return client_1.TourType.PRIVATE_TOUR;
        if (/\b(shared|group|max)\b/.test(text))
            return client_1.TourType.GROUP_TOUR;
        return 'UNKNOWN';
    }
    splitPickUp(raw) {
        const value = raw?.trim();
        if (!value)
            return {};
        const clean = collapse(value);
        const hotelPattern = /^([^,]+?\b(?:Residence|Hotel|Apartment|Apartments|Suite|Suites|Villa|Villas|Stay|Hostel|Homestay|Spa)\b)(?:,\s*)(.*)$/i;
        const match = clean.match(hotelPattern);
        if (match)
            return { hotel: match[1], address: match[2] };
        const comma = clean.indexOf(',');
        if (comma === -1)
            return { hotel: clean };
        const hotel = clean.slice(0, comma).trim();
        const address = clean.slice(comma + 1).trim();
        return hotel ? { hotel, address } : { address };
    }
    parseDollar(raw) {
        if (!raw)
            return null;
        const parsed = parseFloat(raw.replace(/[^0-9.]/g, ''));
        return Number.isNaN(parsed) ? null : parsed;
    }
    parseNumber(raw) {
        if (!raw)
            return null;
        const parsed = parseInt(raw, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }
    normalizeDate(raw) {
        if (!raw)
            return undefined;
        const date = new Date(raw);
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }
};
exports.WebsiteParser = WebsiteParser;
exports.WebsiteParser = WebsiteParser = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [booking_normalizer_service_1.BookingNormalizerService])
], WebsiteParser);
//# sourceMappingURL=website.parser.js.map