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
const extra_util_1 = require("./extra.util");
const action_util_1 = require("./action.util");
const email_util_1 = require("./email.util");
const TOUR_TYPES = [client_1.TourType.PRIVATE_TOUR, client_1.TourType.GROUP_TOUR];
const PAYMENT_STATUSES = [
    client_1.PaymentStatus.PENDING,
    client_1.PaymentStatus.PAID,
    client_1.PaymentStatus.REFUNDED,
];
const SOURCE_TO_CHANNEL = {
    airbnb: client_1.BookingProvider.AIRBNB,
    'booking-com': client_1.BookingProvider.BOOKING_COM,
    getyourguide: client_1.BookingProvider.GETYOURGUIDE,
    viator: client_1.BookingProvider.VIATOR,
    tripadvisor: client_1.BookingProvider.TRIPADVISOR,
    website: client_1.BookingProvider.WEBSITE,
    manual: client_1.BookingProvider.MANUAL,
};
let BookingNormalizerService = class BookingNormalizerService {
    normalize(payload, source = 'website') {
        const parsed = (payload?.booking ?? payload?.parsedBooking ?? {});
        const subject = typeof payload?.subject === 'string' ? payload.subject : '';
        const body = typeof payload?.body === 'string' ? payload.body : '';
        const action = (0, action_util_1.detectAction)(subject, body);
        const bookingRef = this.pickString(parsed.bookingRef) ??
            this.pickString(parsed.confirmationCode) ??
            this.pickString(payload.bookingRef) ??
            this.pickString(payload.confirmationCode);
        if (!bookingRef) {
            return { clean: false, reason: 'NO_BOOKING_REF' };
        }
        const parsedMail = this.pickString(parsed.mail ?? parsed.customerEmail ?? parsed.billingEmail);
        const mail = parsedMail ??
            (0, email_util_1.emailFromHeader)(payload.from) ??
            this.pickString(payload.emailAddress);
        const extra = { ...(this.buildExtra(parsed) ?? {}) };
        if (!parsedMail && mail)
            extra.mailSource = 'sender-fallback';
        const data = {
            action,
            bookingRef,
            source: this.normalizeSource(parsed.source ?? payload.source ?? payload.templateTag ?? source),
            channel: this.normalizeChannel(parsed.channel ??
                payload.channel ??
                SOURCE_TO_CHANNEL[this.normalizeSource(parsed.source ?? payload.source ?? payload.templateTag ?? source)]),
            customerName: this.pickString(parsed.customerName ?? parsed.customer ?? parsed.billingName),
            hotelName: this.pickString(parsed.hotelName ?? parsed.pickUp),
            phone: this.pickString(parsed.phone ?? parsed.customerPhone),
            mail,
            startingDate: this.normalizeDate(parsed.startingDate ??
                parsed.tripDate ??
                parsed.date ??
                parsed.checkIn ??
                parsed.checkin),
            departureTime: this.pickString(parsed.departureTime ?? parsed.departure ?? parsed.time),
            totalPax: this.pickNumber(parsed.totalPax ?? parsed.travellers ?? parsed.paxTotal),
            paxDetail: this.pickString(parsed.paxDetail ?? parsed.pax ?? parsed.priceLines),
            tourId: this.pickString(parsed.tourId),
            tourName: this.pickString(parsed.tourName ?? parsed.tour),
            tourType: this.normalizeTourType(parsed.tourType),
            address: this.pickString(parsed.address),
            latitude: this.pickNumber(parsed.latitude),
            longitude: this.pickNumber(parsed.longitude),
            payment: this.normalizePayment(parsed.payment),
            isNoShow: this.pickBoolean(parsed.isNoShow ?? parsed.noShow),
            noShowReason: this.pickString(parsed.noShowReason),
            extra: Object.keys(extra).length ? extra : undefined,
        };
        return { clean: true, data };
    }
    buildExtra(parsed) {
        const extra = (0, extra_util_1.buildExtra)(parsed);
        return Object.keys(extra).length ? extra : undefined;
    }
    channelForSource(source) {
        if (!source)
            return undefined;
        return (SOURCE_TO_CHANNEL[source.toLowerCase()] ?? this.normalizeChannel(source));
    }
    normalizeSource(raw) {
        const value = this.pickString(raw)?.toLowerCase();
        if (!value)
            return 'website';
        if (value === 'booking.com' || value === 'booking_com')
            return 'booking-com';
        if (value === 'trip' ||
            value === 'tripadvisor' ||
            value === 'tripadvisor.com' ||
            value === 'viator' ||
            value === 'viator.com')
            return 'viator';
        if (SOURCE_TO_CHANNEL[value])
            return value;
        return value;
    }
    normalizeChannel(raw) {
        const value = this.pickString(raw)?.toUpperCase();
        const known = [
            client_1.BookingProvider.TRIPADVISOR,
            client_1.BookingProvider.VIATOR,
            client_1.BookingProvider.GETYOURGUIDE,
            client_1.BookingProvider.AIRBNB,
            client_1.BookingProvider.BOOKING_COM,
            client_1.BookingProvider.WEBSITE,
            client_1.BookingProvider.MANUAL,
        ];
        if (known.includes(value))
            return value;
        if (value === 'TRIP')
            return client_1.BookingProvider.TRIPADVISOR;
        return undefined;
    }
    normalizeTourType(raw) {
        const value = this.pickString(raw)?.toUpperCase();
        return TOUR_TYPES.includes(value)
            ? value
            : undefined;
    }
    normalizePayment(raw) {
        const value = this.pickString(raw)?.toUpperCase();
        return PAYMENT_STATUSES.includes(value)
            ? value
            : undefined;
    }
    normalizeDate(raw) {
        const value = this.pickString(raw);
        if (!value)
            return undefined;
        const date = new Date(value + (value.includes('T') ? '' : 'T00:00:00') + '+07:00');
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