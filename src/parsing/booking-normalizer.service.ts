import { Injectable } from '@nestjs/common';
import { BookingProvider, PaymentStatus, TourType } from '@prisma/client';
import type { BookingFields } from './validation/booking-fields.schema';

const CANCEL_KEYWORDS = /\b(cancel|cancellation|cancelled|canceled|refund)\b/i;
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
export type NormalizeAction = 'CREATE' | 'CANCEL' | 'SKIP';

export interface NormalizeResult {
  clean: boolean;
  reason?: string;
  data?: CleanBookingData;
}

const SOURCE_TO_CHANNEL: Record<string, BookingProvider> = {
  airbnb: BookingProvider.AIRBNB,
  'booking-com': BookingProvider.BOOKING_COM,
  getyourguide: BookingProvider.GETYOURGUIDE,
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

    const action = CANCEL_KEYWORDS.test(subject) ? 'CANCEL' : 'CREATE';

    const bookingRef =
      this.pickString(parsed.bookingRef) ??
      this.pickString(parsed.confirmationCode) ??
      this.pickString(payload.bookingRef) ??
      this.pickString(payload.confirmationCode);
    if (!bookingRef) {
      return { clean: false, reason: 'NO_BOOKING_REF' };
    }

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
      mail:
        this.pickString(
          parsed.mail ?? parsed.customerEmail ?? parsed.billingEmail,
        ) ?? this.pickString(payload.emailAddress),
      startingDate: this.normalizeDate(
        parsed.startingDate ??
          parsed.tripDate ??
          parsed.date ??
          parsed.checkIn ??
          parsed.checkin,
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
    };

    return { clean: true, data };
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
    if (value === 'trip' || value === 'tripadvisor.com') return 'tripadvisor';
    if (SOURCE_TO_CHANNEL[value]) return value;
    return value;
  }

  private normalizeChannel(raw: unknown): BookingProvider | undefined {
    const value = this.pickString(raw)?.toUpperCase();
    if (
      value === 'TRIPADVISOR' ||
      value === 'AIRBNB' ||
      value === 'BOOKING_COM'
    )
      return value;
    if (value === 'WEBSITE' || value === 'MANUAL') return value;
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
    const date = new Date(value + (value.includes('T') ? '' : 'T00:00:00') + '+07:00');
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
