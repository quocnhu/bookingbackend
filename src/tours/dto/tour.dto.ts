import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { TourType } from '@prisma/client';

export class CreateTourDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsEnum(TourType)
  type: TourType;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  adultPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  childPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  infantPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsDateString()
  promotionStartsAt?: string;

  @IsOptional()
  @IsDateString()
  promotionEndsAt?: string;
}

export class UpdateTourDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(TourType)
  type?: TourType;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsString()
  departureLocation?: string;

  @IsOptional()
  @IsString()
  transportation?: string;

  @IsOptional()
  @IsString()
  overview?: string;

  @IsOptional()
  @IsString()
  highlights?: string;

  @IsOptional()
  @IsString()
  includedServices?: string;

  @IsOptional()
  @IsString()
  excludedServices?: string;

  @IsOptional()
  @IsString()
  childrenPolicy?: string;

  @IsOptional()
  @IsString()
  regulations?: string;

  @IsOptional()
  @IsString()
  insurancePolicy?: string;

  @IsOptional()
  @IsString()
  mapQuery?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  adultPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  childPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  infantPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsDateString()
  promotionStartsAt?: string;

  @IsOptional()
  @IsDateString()
  promotionEndsAt?: string;
}

export class ItineraryItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  dayNumber: number;

  @IsInt()
  @Min(0)
  orderIndex: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  timeSlot?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  mapQuery?: string;
}

export class UpdateItineraryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryItemDto)
  items: ItineraryItemDto[];
}

export class ReorderGalleryDto {
  @IsArray()
  @IsString({ each: true })
  files: string[];
}

export class QueryTourDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(TourType)
  type?: TourType;
}
