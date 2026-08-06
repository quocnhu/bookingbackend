import { Injectable } from '@nestjs/common';
import { BookingProvider, BookingStatus, PaymentStatus, TourType } from '@prisma/client';

export type NormalizeAction = 'CREATE' | 'CANCEL' | 'SKIP';

export interface CleanBookingData {
  action: NormalizeAction;
  bookingRef?: string;
  channel?: BookingProvider;
  tourId?: string;
  tourName?: string;
  tourType?: TourType;
  address?: string;
  latitude?: number;
  longitude?: number;
  startingDate?: string;
  customerName?: string;
  hotelName?: string;
  phone?: string;
  mail?: string;
  totalPax?: number;
  paxDetail?: string;
  payment?: PaymentStatus;
  isNoShow?: boolean;
  noShowReason?: string;
}

export interface NormalizeResult {
  clean: boolean;
  reason?: string;
  data?: CleanBookingData;
}

const CANCEL_KEYWORDS = /\b(cancel|cancellation|cancelled|canceled|refund)\b/i;
const TOUR_TYPES: TourType[] = [TourType.PRIVATE_TOUR, TourType.GROUP_TOUR];
const PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.REFUNDED,
];

/**
 * Chuyển payload thô (RawData) thành JSON sạch cho Booking.
 * Parser thật (TripAdvisor / Website HTML) sẽ đổ dữ liệu vào `payload.booking`;
 * những field bổ sung cấp payload (subject, emailAddress, ...) được dùng để
 * hoàn thiện/normalize. Không resolve được bookingRef -> SKIP (chống rác).
 */
@Injectable()
export class BookingNormalizerService {
  normalize(payload: Record<string, unknown>): NormalizeResult {
    const parsed = (payload?.booking ?? payload?.parsedBooking ?? {}) as Record<string, unknown>;
    const subject = typeof payload?.subject === 'string' ? payload.subject : '';

    const action: NormalizeAction = CANCEL_KEYWORDS.test(subject) ? 'CANCEL' : 'CREATE';

    const bookingRef = this.pickString(parsed.bookingRef) ?? this.pickString(payload.bookingRef);
    if (!bookingRef) {
      return { clean: false, reason: 'NO_BOOKING_REF' };
    }

    const data: CleanBookingData = {
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

  private normalizeChannel(raw: unknown): BookingProvider | undefined {
    const value = this.pickString(raw)?.toUpperCase();
    if (value === 'TRIPADVISOR' || value === 'WEBSITE' || value === 'MANUAL') {
      return value as BookingProvider;
    }
    if (value === 'TRIP') return BookingProvider.TRIPADVISOR;
    return undefined;
  }

  private normalizeTourType(raw: unknown): TourType | undefined {
    const value = this.pickString(raw)?.toUpperCase();
    return TOUR_TYPES.includes(value as TourType) ? (value as TourType) : undefined;
  }

  private normalizePayment(raw: unknown): PaymentStatus | undefined {
    const value = this.pickString(raw)?.toUpperCase();
    return PAYMENT_STATUSES.includes(value as PaymentStatus) ? (value as PaymentStatus) : undefined;
  }

  private normalizeDate(raw: unknown): string | undefined {
    const value = this.pickString(raw);
    if (!value) return undefined;
    const date = new Date(value);
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
      if (['true', 'yes', '1', 'no-show', 'noshow'].includes(normalized)) return true;
      if (['false', 'no', '0'].includes(normalized)) return false;
    }
    return undefined;
  }
}
