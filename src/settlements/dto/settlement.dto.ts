import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { PayeeType, SettlementStatus } from '@prisma/client';

export class CreateSettlementDto {
  @IsString()
  assignmentId: string;

  @IsEnum(PayeeType)
  payeeType: PayeeType;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @Type(() => Number)
  @IsNumber()
  baseAmount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allowance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deduction?: number;

  @IsOptional()
  @IsString()
  periodName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  expenseItems?: ExpenseItemDto[];
}

export class ExpenseItemDto {
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

export class UpdateSettlementDto {
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allowance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deduction?: number;

  @IsOptional()
  @IsString()
  periodName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QuerySettlementDto extends PaginationDto {
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @IsOptional()
  @IsEnum(PayeeType)
  payeeType?: PayeeType;
}
