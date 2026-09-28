import {
  BookingProvider,
  BookingStatus,
  PaymentStatus,
  TourType,
} from '@prisma/client';

export type ParsedAction = 'CREATE' | 'CANCEL';

/**
 * Fields đã được parser extract — ánh xạ 1-1 với model Prisma Booking
 * (+ action/source để phân nhánh xử lý). Validate trước khi upsert.
 */
export interface BookingFields {
  action: ParsedAction;
  /** Mã xác nhận (bookingRef / confirmationCode) — key upsert cùng source. */
  bookingRef: string;
  /** 'airbnb' | 'booking-com' | 'getyourguide' | 'tripadvisor' | 'website' | 'manual' */
  source: string;
  channel?: BookingProvider;
  status?: BookingStatus;
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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: BookingFields;
}

const SOURCES = new Set([
  'airbnb',
  'booking-com',
  'getyourguide',
  'tripadvisor',
  'website',
  'manual',
]);

/**
 * Validate fields từ parser (bước 15-16 trong .md).
 * Không có bookingRef (confirmation code) hoặc source -> parse_failed.
 */
export function validateBookingFields(fields: BookingFields): ValidationResult {
  const errors: string[] = [];

  if (!fields.bookingRef) errors.push('Missing bookingRef/confirmationCode');
  if (!fields.source) errors.push('Missing source');
  else if (!SOURCES.has(fields.source))
    errors.push(`Unknown source: ${fields.source}`);

  if (fields.startingDate && Number.isNaN(Date.parse(fields.startingDate))) {
    errors.push(`Invalid startingDate: ${fields.startingDate}`);
  }

  if (
    fields.totalPax != null &&
    (!Number.isFinite(fields.totalPax) || fields.totalPax < 0)
  ) {
    errors.push(`Invalid totalPax: ${fields.totalPax}`);
  }

  if (fields.latitude != null && !Number.isFinite(fields.latitude)) {
    errors.push(`Invalid latitude: ${fields.latitude}`);
  }
  if (fields.longitude != null && !Number.isFinite(fields.longitude)) {
    errors.push(`Invalid longitude: ${fields.longitude}`);
  }

  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [], data: fields };
}
