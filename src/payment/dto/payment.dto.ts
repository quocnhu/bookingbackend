import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingProvider, PaymentStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class CreatePayPalOrderDto {
  @IsNotEmpty()
  @IsString()
  bookingId: string;
}

export class CancelPayPalOrderDto {
  @IsNotEmpty()
  @IsString()
  bookingId: string;
}

export class CapturePayPalOrderDto {
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

export class RecordOtaRemittanceDto {
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  netAmount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  grossAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commissionAmount?: number;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  reference?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  note?: string;
}


export class QueryBookingPaymentsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment?: PaymentStatus;

  @IsOptional()
  @IsEnum(BookingProvider)
  channel?: BookingProvider;

  @IsOptional()
  @IsString()
  search?: string;
}
