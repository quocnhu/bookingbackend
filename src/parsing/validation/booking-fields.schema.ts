import {
  BookingProvider,
  BookingStatus,
  PaymentStatus,
  TourType,
} from '@prisma/client';

export type ParsedAction = 'CREATE' | 'CANCEL';

/**
 * Fields already extracted by the parser — map 1-1 to the Prisma Booking model
 * (+ action/source to branch the processing). Validate before upserting.
 */
export interface BookingFields {
  action: ParsedAction;
  /** Confirmation code (bookingRef / confirmationCode) — upsert key together with source. */
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
 * Validate fields from the parser (steps 15-16 in .md).
 * No bookingRef (confirmation code) or source -> parse_failed.
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
