import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { GuideType } from '@prisma/client';

export enum GuideConfirmationStatus {
  AWAITING = 'AWAITING',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
}

export class QueryGuideConfirmationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(GuideConfirmationStatus)
  status?: GuideConfirmationStatus;

  @IsOptional()
  @IsEnum(GuideType)
  guideType?: GuideType;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
