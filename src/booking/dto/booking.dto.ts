import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
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
 * `mail` is the exception: the public form allows a guest to leave the email
 * blank, so it is optional here, while the admin flow requires it — checked
 * based on `channel` in BookingService.create(). Making it required in the DTO
 * would break public tour booking.
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
  @IsBoolean()
  isNoShow?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  noShowReason?: string;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

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
