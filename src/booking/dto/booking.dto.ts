import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  BookingProvider,
  BookingStatus,
  PaymentStatus,
  TourType,
} from '@prisma/client';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  bookingRef?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  confirmationCode?: string;

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
  address?: string;

  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  startingDate?: string | Date;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsNotEmpty()
  @IsString()
  hotelName: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  mail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  totalPax?: number;

  @IsOptional()
  @IsString()
  paxDetail?: string;

  @IsOptional()
  @IsEnum(TourType)
  tourType?: TourType;

  @IsOptional()
  @IsString()
  tourName?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment?: PaymentStatus;

  @IsOptional()
  @IsBoolean()
  isNoShow?: boolean;

  @IsOptional()
  @IsString()
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
  address?: string;

  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  startingDate?: string | Date;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  hotelName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  totalPax?: number;

  @IsOptional()
  @IsString()
  paxDetail?: string;

  @IsOptional()
  @IsEnum(TourType)
  tourType?: TourType;

  @IsOptional()
  @IsString()
  tourName?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment?: PaymentStatus;

  @IsOptional()
  @IsBoolean()
  isNoShow?: boolean;

  @IsOptional()
  @IsString()
  noShowReason?: string;
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
