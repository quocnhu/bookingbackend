import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { GuideHoldStatus } from '@prisma/client';

export class CreateGuideHoldDto {
  @IsNotEmpty()
  @IsString()
  guideId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateGuideHoldDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class QueryGuideHoldDto {
  @IsOptional()
  @IsString()
  guideId?: string;

  @IsOptional()
  @IsEnum(GuideHoldStatus)
  status?: GuideHoldStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
