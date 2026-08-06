"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingNormalizerService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const CANCEL_KEYWORDS = /\b(cancel|cancellation|cancelled|canceled|refund)\b/i;
const TOUR_TYPES = [client_1.TourType.PRIVATE_TOUR, client_1.TourType.GROUP_TOUR];
const PAYMENT_STATUSES = [
    client_1.PaymentStatus.PENDING,
    client_1.PaymentStatus.PAID,
    client_1.PaymentStatus.REFUNDED,
];
let BookingNormalizerService = class BookingNormalizerService {
    normalize(payload) {
        const parsed = (payload?.booking ?? payload?.parsedBooking ?? {});
        const subject = typeof payload?.subject === 'string' ? payload.subject : '';
        const action = CANCEL_KEYWORDS.test(subject) ? 'CANCEL' : 'CREATE';
        const bookingRef = this.pickString(parsed.bookingRef) ?? this.pickString(payload.bookingRef);
        if (!bookingRef) {
            return { clean: false, reason: 'NO_BOOKING_REF' };
        }
        const data = {
            action,
            bookingRef,
            channel: this.normalizeChannel(parsed.channel ?? payload.channel),
            tourId: this.pickString(parsed.tourId),
            tourName: this.pickString(parsed.tourName),
            tourType: this.normalizeTourType(parsed.tourType),
            address: this.pickString(parsed.address),
            latitude: this.pickNumber(parsed.latitude),
            longitude: this.pickNumber(parsed.longitude),
            startingDate: this.normalizeDate(parsed.startingDate ?? parsed.tripDate ?? parsed.date),
            customerName: this.pickString(parsed.customerName ?? parsed.customer ?? parsed.billingName),
            hotelName: this.pickString(parsed.hotelName ?? parsed.pickUp),
            phone: this.pickString(parsed.phone ?? parsed.customerPhone),
            mail: this.pickString(parsed.mail ?? parsed.customerEmail ?? parsed.billingEmail) ?? this.pickString(payload.emailAddress),
            totalPax: this.pickNumber(parsed.totalPax ?? parsed.travellers ?? parsed.paxTotal),
            paxDetail: this.pickString(parsed.paxDetail ?? parsed.pax ?? parsed.priceLines),
            payment: this.normalizePayment(parsed.payment),
            isNoShow: this.pickBoolean(parsed.isNoShow ?? parsed.noShow),
            noShowReason: this.pickString(parsed.noShowReason),
        };
        return { clean: true, data };
    }
    normalizeChannel(raw) {
        const value = this.pickString(raw)?.toUpperCase();
        if (value === 'TRIPADVISOR' || value === 'WEBSITE' || value === 'MANUAL') {
            return value;
        }
        if (value === 'TRIP')
            return client_1.BookingProvider.TRIPADVISOR;
        return undefined;
    }
    normalizeTourType(raw) {
        const value = this.pickString(raw)?.toUpperCase();
        return TOUR_TYPES.includes(value) ? value : undefined;
    }
    normalizePayment(raw) {
        const value = this.pickString(raw)?.toUpperCase();
        return PAYMENT_STATUSES.includes(value) ? value : undefined;
    }
    normalizeDate(raw) {
        const value = this.pickString(raw);
        if (!value)
            return undefined;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    pickString(value) {
        if (typeof value === 'string' && value.trim())
            return value.trim();
        if (typeof value === 'number')
            return String(value);
        return undefined;
    }
    pickNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    pickBoolean(value) {
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'number')
            return value === 1;
        if (typeof value === 'string') {
            const normalized = value.toLowerCase();
            if (['true', 'yes', '1', 'no-show', 'noshow'].includes(normalized))
                return true;
            if (['false', 'no', '0'].includes(normalized))
                return false;
        }
        return undefined;
    }
};
exports.BookingNormalizerService = BookingNormalizerService;
exports.BookingNormalizerService = BookingNormalizerService = __decorate([
    (0, common_1.Injectable)()
], BookingNormalizerService);
//# sourceMappingURL=booking-normalizer.service.js.map