import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BookingProvider,
  BookingStatus,
  PaymentStatus,
  TourType,
} from '@prisma/client';

/**
 * What the email means for the booking it references:
 *  - CREATE — a new booking (or a re-sent confirmation of a known one)
 *  - MODIFY — an amendment: the SAME reference with different details
 *  - CANCEL — the booking was cancelled
 */
export type ParsedAction = 'CREATE' | 'MODIFY' | 'CANCEL';
export const PARSED_ACTIONS: ParsedAction[] = ['CREATE', 'MODIFY', 'CANCEL'];

/** Every template parser must resolve to one of these sources. */
export const PARSED_SOURCES = [
  'airbnb',
  'booking-com',
  'getyourguide',
  'viator',
  'website',
  'manual',
] as const;

/**
 * Standard booking form contract that **every** email template must produce
 * before a Booking row is written. It mirrors the properties of the Prisma
 * `Booking` model (Ref/Confirmation/Source/Channel/Customer/Phone/Email/Hotel/
 * Tour/Tour type/Start date/Pax/Note/Address/Location/Status/Payment/No-show…).
 *
 * Two keys are MANDATORY (per the standard form): the confirmation **Ref**
 * (`bookingRef`) and the customer **Email** (`mail`). A template that cannot
 * resolve either is rejected (rawData → `parse_failed`) so no half-filled
 * booking is ever created.
 *
 * Field names intentionally match the existing parser/Booking keys — no rename.
 */
export class TemplateBookingDto {
  @IsIn(PARSED_ACTIONS)
  action!: ParsedAction;

  /** Ref — confirmation code (upsert key together with `source`). MANDATORY. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bookingRef!: string;

  /** Source template tag. MANDATORY. */
  @IsIn([...PARSED_SOURCES])
  source!: string;

  @IsOptional()
  @IsEnum(BookingProvider)
  channel?: BookingProvider;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  tourId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tourName?: string;

  @IsOptional()
  @IsEnum(TourType)
  tourType?: TourType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  /** ISO string or Date — validated with Date.parse() in the schema. */
  @IsOptional()
  startingDate?: string | Date;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  hotelName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  /** Email — the customer email address. MANDATORY. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mail!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  paxDetail?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment?: PaymentStatus;

  @IsOptional()
  @IsBoolean()
  isNoShow?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  noShowReason?: string;

  /**
   * Dynamic catch-all for provider-specific fields (productBookingRef,
   * extBookingRef, supplier, soldBy, bookingChannel, rate, guidedLanguages,
   * extras, inclusions, externalTicketRefs, totalcost...). Persisted verbatim
   * into `Booking.extra`.
   */
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}
