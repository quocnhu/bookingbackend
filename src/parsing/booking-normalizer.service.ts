import { Injectable } from '@nestjs/common';
import { BookingProvider, PaymentStatus, TourType } from '@prisma/client';
import { buildExtra } from './extra.util';
import { detectAction } from './action.util';
import { emailFromHeader } from './email.util';
import type { BookingFields } from './validation/booking-fields.schema';

const TOUR_TYPES: TourType[] = [TourType.PRIVATE_TOUR, TourType.GROUP_TOUR];
const PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.REFUNDED,
];

/** Internal type for clean booking data - ISO strings for Prisma */
export interface CleanBookingData extends Omit<BookingFields, 'startingDate'> {
  startingDate?: string | undefined;
}
export type NormalizeAction = 'CREATE' | 'MODIFY' | 'CANCEL' | 'SKIP';

export interface NormalizeResult {
  clean: boolean;
  reason?: string;
  data?: CleanBookingData;
}

const SOURCE_TO_CHANNEL: Record<string, BookingProvider> = {
  airbnb: BookingProvider.AIRBNB,
  'booking-com': BookingProvider.BOOKING_COM,
  getyourguide: BookingProvider.GETYOURGUIDE,
  viator: BookingProvider.VIATOR,
  tripadvisor: BookingProvider.TRIPADVISOR,
  website: BookingProvider.WEBSITE,
  manual: BookingProvider.MANUAL,
};

/**
 * Convert a raw payload (RawData) into BookingFields matching the Prisma Booking model.
 * The real parsers (TripAdvisor / Website HTML) put their data in `payload.booking`;
 * additional fields from the payload (subject, emailAddress, ...) are used to complete it.
 * bookingRef cannot be resolved -> SKIP (prevents junk records).
 */
@Injectable()
export class BookingNormalizerService {
  normalize(
    payload: Record<string, unknown>,
    source = 'website',
  ): NormalizeResult {
    const parsed = (payload?.booking ?? payload?.parsedBooking ?? {}) as Record<
      string,
      unknown
    >;
    const subject = typeof payload?.subject === 'string' ? payload.subject : '';
    const body = typeof payload?.body === 'string' ? payload.body : '';

    const action = detectAction(subject, body);

    const bookingRef =
      this.pickString(parsed.bookingRef) ??
      this.pickString(parsed.confirmationCode) ??
      this.pickString(payload.bookingRef) ??
      this.pickString(payload.confirmationCode);
    if (!bookingRef) {
      return { clean: false, reason: 'NO_BOOKING_REF' };
    }

    const parsedMail = this.pickString(
      parsed.mail ?? parsed.customerEmail ?? parsed.billingEmail,
    );
    const mail =
      parsedMail ??
      emailFromHeader(payload.from) ??
      this.pickString(payload.emailAddress);
    const extra = { ...(this.buildExtra(parsed) ?? {}) };
    if (!parsedMail && mail) extra.mailSource = 'sender-fallback';

    const data: CleanBookingData = {
      action,
      bookingRef,
      source: this.normalizeSource(
        parsed.source ?? payload.source ?? payload.templateTag ?? source,
      ),
      channel: this.normalizeChannel(
        parsed.channel ??
          payload.channel ??
          SOURCE_TO_CHANNEL[
            this.normalizeSource(
              parsed.source ?? payload.source ?? payload.templateTag ?? source,
            )
          ],
      ),
      customerName: this.pickString(
        parsed.customerName ?? parsed.customer ?? parsed.billingName,
      ),
      hotelName: this.pickString(parsed.hotelName ?? parsed.pickUp),
      phone: this.pickString(parsed.phone ?? parsed.customerPhone),
      mail,
      startingDate: this.normalizeDate(
        parsed.startingDate ??
          parsed.tripDate ??
          parsed.date ??
          parsed.checkIn ??
          parsed.checkin,
      ),
      departureTime: this.pickString(
        parsed.departureTime ?? parsed.departure ?? parsed.time,
      ),
      totalPax: this.pickNumber(
        parsed.totalPax ?? parsed.travellers ?? parsed.paxTotal,
      ),
      paxDetail: this.pickString(
        parsed.paxDetail ?? parsed.pax ?? parsed.priceLines,
      ),
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

  private buildExtra(
    parsed: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const extra = buildExtra(parsed);
    return Object.keys(extra).length ? extra : undefined;
  }

  channelForSource(source?: string): BookingProvider | undefined {
    if (!source) return undefined;
    return (
      SOURCE_TO_CHANNEL[source.toLowerCase()] ?? this.normalizeChannel(source)
    );
  }

  private normalizeSource(raw: unknown): string {
    const value = this.pickString(raw)?.toLowerCase();
    if (!value) return 'website';
    if (value === 'booking.com' || value === 'booking_com')
      return 'booking-com';
    if (
      value === 'trip' ||
      value === 'tripadvisor' ||
      value === 'tripadvisor.com' ||
      value === 'viator' ||
      value === 'viator.com'
    )
      return 'viator';
    if (SOURCE_TO_CHANNEL[value]) return value;
    return value;
  }

  private normalizeChannel(raw: unknown): BookingProvider | undefined {
    const value = this.pickString(raw)?.toUpperCase();
    const known: BookingProvider[] = [
      BookingProvider.TRIPADVISOR,
      BookingProvider.VIATOR,
      BookingProvider.GETYOURGUIDE,
      BookingProvider.AIRBNB,
      BookingProvider.BOOKING_COM,
      BookingProvider.WEBSITE,
      BookingProvider.MANUAL,
    ];
    if (known.includes(value as BookingProvider))
      return value as BookingProvider;
    if (value === 'TRIP') return BookingProvider.TRIPADVISOR;
    return undefined;
  }

  private normalizeTourType(raw: unknown): TourType | undefined {
    const value = this.pickString(raw)?.toUpperCase();
    return TOUR_TYPES.includes(value as TourType)
      ? (value as TourType)
      : undefined;
  }

  private normalizePayment(raw: unknown): PaymentStatus | undefined {
    const value = this.pickString(raw)?.toUpperCase();
    return PAYMENT_STATUSES.includes(value as PaymentStatus)
      ? (value as PaymentStatus)
      : undefined;
  }

  private normalizeDate(raw: unknown): string | undefined {
    const value = this.pickString(raw);
    if (!value) return undefined;
    // Parse as Vietnam local time (UTC+7) and convert to ISO string for storage
    const date = new Date(
      value + (value.includes('T') ? '' : 'T00:00:00') + '+07:00',
    );
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  private pickString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
    return undefined;
  }

  private pickNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private pickBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (['true', 'yes', '1', 'no-show', 'noshow'].includes(normalized))
        return true;
      if (['false', 'no', '0'].includes(normalized)) return false;
    }
    return undefined;
  }
}
