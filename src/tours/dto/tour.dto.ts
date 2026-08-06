import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
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
}

export class UpdateItineraryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryItemDto)
  items: ItineraryItemDto[];
}

export class QueryTourDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(TourType)
  type?: TourType;
}
