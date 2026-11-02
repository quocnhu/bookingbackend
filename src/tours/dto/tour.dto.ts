import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMilitaryTime,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DurationUnit, TourType } from '@prisma/client';

export class PrivatePaxPriceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  pax: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerPerson: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateTourDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsEnum(TourType)
  type: TourType;

  @IsOptional()
  @IsBoolean()
  requiresGuide?: boolean;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsMilitaryTime({ each: true })
  departureTimes?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationValue?: number;

  @IsOptional()
  @IsEnum(DurationUnit)
  durationUnit?: DurationUnit;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeCancellationValue?: number;

  @IsOptional()
  @IsEnum(DurationUnit)
  freeCancellationUnit?: DurationUnit;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeCancellationHours?: number;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

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
  privateDiscountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  groupDiscountPercent?: number;

  @IsOptional()
  @IsDateString()
  promotionStartsAt?: string;

  @IsOptional()
  @IsDateString()
  promotionEndsAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourTypePriceDto)
  typePrices?: TourTypePriceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrivatePaxPriceDto)
  privatePaxPrices?: PrivatePaxPriceDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsString()
  primaryCategoryId?: string;
}

export class TourTypePriceDto {
  @IsEnum(TourType)
  type: TourType;

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
  @IsBoolean()
  requiresGuide?: boolean;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsMilitaryTime({ each: true })
  departureTimes?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationValue?: number;

  @IsOptional()
  @IsEnum(DurationUnit)
  durationUnit?: DurationUnit;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeCancellationValue?: number;

  @IsOptional()
  @IsEnum(DurationUnit)
  freeCancellationUnit?: DurationUnit;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeCancellationHours?: number;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

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
  privateDiscountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  groupDiscountPercent?: number;

  @IsOptional()
  @IsDateString()
  promotionStartsAt?: string;

  @IsOptional()
  @IsDateString()
  promotionEndsAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourTypePriceDto)
  typePrices?: TourTypePriceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrivatePaxPriceDto)
  privatePaxPrices?: PrivatePaxPriceDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsString()
  primaryCategoryId?: string;
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
  @IsEnum(TourType)
  type?: TourType;

  @IsOptional()
  @IsString()
  category?: string;
}
