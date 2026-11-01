import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsMilitaryTime,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  BookingProvider,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  TourType,
} from '@prisma/client';

/**
 * Create a booking. Shared by 2 flows: the admin Add Booking form, and the
 * public tour booking form on the website.
 *
 * Every field the user enters manually is required; if missing, the
 * ValidationPipe blocks it right at the controller.
 *
 * `mail` is optional here so the controller can accept parsed-email payloads,
 * but BookingService.create() requires it for every API-created booking.
 * `paxDetail` is also optional at the DTO level: the manual and website flows
 * require it in BookingService.create(), while parsed-email bookings may omit it.
 *
 * `bookingRef` is optional because the server generates it. `notes` is a free
 * text note from the user. `paxDetail` is NOT a note — it is data written by
 * the email pipeline (see BookingNormalizerService) and is left untouched so
 * the parse flow is not broken.
 */
export class CreateBookingDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  bookingRef?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  source?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  confirmationCode?: string;

  @IsOptional()
  @IsEnum(BookingProvider)
  channel?: BookingProvider;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsNotEmpty()
  @IsString()
  tourId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  address: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsNotEmpty()
  startingDate?: string | Date;

  @IsOptional()
  @IsMilitaryTime()
  departureTime?: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  customerName: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  hotelName: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[+]?[\d\s\-()]{7,20}$/)
  phone: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 100)
  mail?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  totalPax: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  paxDetail?: string;

  @IsNotEmpty()
  @IsEnum(TourType)
  tourType: TourType;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  tourName?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  payLater?: boolean;

  @IsOptional()
  @IsDateString()
  paymentDueAt?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  paymentNote?: string;

  @IsOptional()
  @IsBoolean()
  isNoShow?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  noShowReason?: string;
}

/** Preview the server-side total before a website booking/payment is created. */
export class WebsiteQuoteDto {
  @IsNotEmpty()
  @IsString()
  tourId: string;

  @IsNotEmpty()
  @IsEnum(TourType)
  tourType: TourType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  totalPax: number;
}

/** Public/website booking, always tied to the signed-in customer account. */
export class CreateWebsiteBookingDto {
  @IsNotEmpty()
  @IsString()
  tourId: string;

  @IsNotEmpty()
  @IsEnum(TourType)
  tourType: TourType;

  @IsNotEmpty()
  startingDate: string | Date;

  @IsOptional()
  @IsMilitaryTime()
  departureTime?: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  customerName: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  hotelName: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[+]?[\d\s\-()]{7,20}$/)
  phone: string;

  @IsEmail()
  @Length(1, 100)
  mail: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  totalPax: number;

  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  paxDetail: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  address: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  payLater?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  paymentNote?: string;
}

export class CollectBookingPaymentDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  note?: string;
}

export class ConfirmBookingPaymentDto extends CollectBookingPaymentDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reference?: string;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  /**
   * Cancel a booking even though the 24h cancellation window has closed.
   * Administrator only — the override is recorded in the audit trail.
   */
  @IsOptional()
  @IsBoolean()
  overrideCancelWindow?: boolean;

  @IsOptional()
  @IsString()
  tourId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  startingDate?: string | Date;

  @IsOptional()
  @IsMilitaryTime()
  departureTime?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  customerName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  hotelName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+]?[\d\s\-()]{7,20}$/)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 100)
  mail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  totalPax?: number;

  @IsOptional()
  @IsEnum(TourType)
  tourType?: TourType;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  tourName?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment?: PaymentStatus;

  @IsOptional()
  @IsBoolean()
  isNoShow?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  noShowReason?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class QueryBookingDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsEnum(BookingProvider)
  channel?: BookingProvider;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment?: PaymentStatus;

  @IsOptional()
  @IsString()
  tourId?: string;

  @IsOptional()
  @IsString()
  assignmentId?: string;
}

export class BookingPatchDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class BatchUpdateBookingsDto {
  @IsNotEmpty()
  @Type(() => BookingPatchDto)
  @ValidateNested({ each: true })
  items: BookingPatchDto[];
}
