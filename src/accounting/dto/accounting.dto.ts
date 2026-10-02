import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const PAYABLE_ROLES = ['TOUR_GUIDE', 'DRIVER'] as const;

const PAYEE_TYPES = [
  'TRANSPORT_PROVIDER',
  'COMPANY_GUIDE',
  'COMPANY_DRIVER',
  'FREELANCE',
] as const;

export class PayeeTypeDto {
  @IsOptional()
  @IsIn(PAYEE_TYPES)
  payeeType?: (typeof PAYEE_TYPES)[number];
}

/** People who can be included in a payment period export: guide or driver. */
export class PeriodQueryDto {
  @IsDateString()
  fromDate!: string;

  @IsDateString()
  toDate!: string;

  /** Payee group: TRANSPORT_PROVIDER | COMPANY_GUIDE | COMPANY_DRIVER | FREELANCE */
  @IsOptional()
  @IsIn(PAYEE_TYPES)
  payeeType?: (typeof PAYEE_TYPES)[number];

  /**
   * userId for guide/driver, providerId for external transport providers. If left
   * blank, the preview shows everyone — reference only, cannot be exported.
   */
  @IsOptional()
  @IsString()
  payeeId?: string;

  /** @deprecated use payeeId. Kept for older clients. */
  @IsOptional()
  @IsString()
  personId?: string;

  /** true = only fetch trips whose money is locked but NOT yet exported. */
  @IsOptional()
  @IsBoolean()
  unpaidOnly?: boolean;
}

export class ExportPeriodDto {
  @IsDateString()
  fromDate!: string;

  @IsDateString()
  toDate!: string;

  @IsOptional()
  @IsIn(PAYEE_TYPES)
  payeeType?: (typeof PAYEE_TYPES)[number];

  @IsString()
  payeeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class VerifyTourMoneyDto {
  /** Note recorded during verification. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /**
   * The person paid for this trip. Required when the trip has both a guide and
   * a driver — each trip is linked to exactly one person per period (see accounting.md).
   */
  @IsOptional()
  @IsString()
  payableToId?: string;
}

/** Accounting sends the money sheet back to the submitter for review. */
export class RejectMoneyDto {
  @IsString()
  @MinLength(5, { message: 'reason must be at least 5 characters' })
  @MaxLength(500)
  reason!: string;
}

export class CreateSettlementDto {
  @IsNumber()
  @Min(0.0000001)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;
}

export class UpdateSettlementDto {
  @IsOptional()
  @IsNumber()
  @Min(0.0000001)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class CreateSettlementCategoryDto {
  @IsString()
  @MaxLength(60)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(['COLLECT_MONEY', 'PAY_MONEY'])
  flowType!: 'COLLECT_MONEY' | 'PAY_MONEY';
}

export class ListPeopleQueryDto {
  @IsOptional()
  @IsIn(PAYABLE_ROLES)
  role?: (typeof PAYABLE_ROLES)[number];
}

export class PeriodIdParamDto {
  @IsString()
  id!: string;
}

export class LimitQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class VoidPeriodDto {
  /**
   * Required. A payment period is money data — after cancelling it we must know
   * why, and the reason is stored in the audit log.
   */
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
