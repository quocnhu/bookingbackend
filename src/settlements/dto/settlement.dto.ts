import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { FeeFlowType } from '@prisma/client';

export class CreateSettlementDto {
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  customCategoryName?: string;

  // Lớp 1: tùy chọn gắn theo Booking
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  // Lớp 2: tùy chọn gắn theo Assignment
  @IsOptional()
  @IsUUID()
  assignmentId?: string;
}

export class CreateSettlementCategoryDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsIn(['COLLECT_MONEY', 'PAY_MONEY'])
  flowType: FeeFlowType;
}

export class UpdateSettlementDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  customCategoryName?: string;
}

export class QuerySettlementDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
