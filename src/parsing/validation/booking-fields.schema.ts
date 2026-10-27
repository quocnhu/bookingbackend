import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  BookingProvider,
  BookingStatus,
  PaymentStatus,
  TourType,
} from '@prisma/client';
import {
  ParsedAction,
  PARSED_SOURCES,
  TemplateBookingDto,
} from './template-booking.dto';

export type { ParsedAction };
export { PARSED_SOURCES };

/**
 * Structural shape a parser returns. It mirrors the standard booking form but
 * stays permissive at the type level (e.g. `mail` may be blank) so heuristic
 * parsers compile; the contract itself is enforced at runtime by
 * `TemplateBookingDto` inside `validateBookingFields`.
 */
export interface BookingFields {
  action: ParsedAction;
  /** Confirmation code (bookingRef / confirmationCode) — upsert key with source. MANDATORY. */
  bookingRef: string;
  /** 'airbnb' | 'booking-com' | 'getyourguide' | 'viator' | 'website' | 'manual' */
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
  departureTime?: string;
  customerName?: string;
  hotelName?: string;
  phone?: string;
  /** Customer email address. MANDATORY (enforced by the DTO). */
  mail?: string;
  totalPax?: number;
  paxDetail?: string;
  payment?: PaymentStatus;
  isNoShow?: boolean;
  noShowReason?: string;
  /** Provider-specific fields with no dedicated Booking column → `Booking.extra`. */
  extra?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: BookingFields;
}

/**
 * Validate a parser output against the standard booking form (`TemplateBookingDto`).
 * Ref + Email are mandatory; extra provider fields ride along in `extra`.
 * Validation failure → rawData is marked `parse_failed` (per the .md steps 15-16).
 */
export function validateBookingFields(fields: BookingFields): ValidationResult {
  const dto = plainToInstance(TemplateBookingDto, fields);
  const violations = validateSync(dto, {
    skipMissingProperties: false,
    whitelist: false,
    forbidNonWhitelisted: false,
  });

  const errors: string[] = [];
  for (const violation of violations) {
    errors.push(...Object.values(violation.constraints ?? {}));
    if (violation.children?.length) {
      for (const child of violation.children) {
        errors.push(...Object.values(child.constraints ?? {}));
      }
    }
  }

  // Extra guards not covered by type decorators (kept from the original schema).
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
  return { valid: true, errors: [], data: dto as unknown as BookingFields };
}
