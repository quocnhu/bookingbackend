import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AssignmentOrigin, AssignmentStatus, TourReportStatus } from '@prisma/client';

export class CreateAssignmentDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  tourName?: string;

  @IsString()
  startDate: string | Date;

  @IsString()
  endDate: string | Date;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  guideId?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sequenceIndex?: number;

  @IsOptional()
  @Type(() => Number)
  priceOverride?: number;

  @IsOptional()
  @IsString()
  tripNotes?: string;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  tourName?: string;

  @IsOptional()
  startDate?: string | Date;

  @IsOptional()
  endDate?: string | Date;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  guideId?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sequenceIndex?: number;

  @IsOptional()
  @Type(() => Number)
  priceOverride?: number;

  @IsOptional()
  @IsString()
  tripNotes?: string;
}

export class UpdateAssignmentStatusDto {
  @IsEnum(AssignmentStatus)
  status: AssignmentStatus;
}

/** Bật/tắt nguồn tạo cho toàn bộ assignment trên Dispatch Board (Manual / Auto). */
export class SetBoardOriginDto {
  @IsEnum(AssignmentOrigin)
  origin: AssignmentOrigin;
}

export class AssignBookingsDto {
  @IsArray()
  @IsString({ each: true })
  bookingIds: string[];
}

/** Xếp lại thứ tự khách trong 1 bus (drag-and-drop, bookingflow.md bước 3). */
export class ReorderBookingsDto {
  @IsArray()
  @IsString({ each: true })
  bookingIds: string[];
}

/** Di chuyển booking sang bus khác (drag-and-drop). */
export class MoveBookingDto {
  @IsString()
  toAssignmentId: string;
}

export class QueryAssignmentDto extends PaginationDto {
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  guideId?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class SubmitTourReportDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actualPax?: number;

  @IsOptional()
  @IsString()
  pickupNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  fuelCost?: number;

  @IsOptional()
  @Type(() => Number)
  tollParking?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  // Ảnh chứng từ HDV upload (từ POST /assignments/:id/tour-report/images)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceImageDto)
  evidenceImages?: EvidenceImageDto[];
}

export class EvidenceImageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  ext?: string;

  @IsOptional()
  @IsString()
  uploadedAt?: string;

  @IsOptional()
  @IsString()
  uploadedByName?: string;
}

export class VerifyTourReportDto {
  @IsIn(['VERIFIED', 'REJECTED'])
  status: 'VERIFIED' | 'REJECTED';

  @IsOptional()
  @IsString()
  verificationNotes?: string;
}

export class FinalizeServiceDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  name: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;
}

export class BookingSettlementInputDto {
  @IsString()
  bookingId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  collect?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  refund?: number;
}

export class FinalizeAssignmentDto {
  @Type(() => Number)
  @IsNumber()
  collectedAmount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  refundedAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinalizeServiceDto)
  services?: FinalizeServiceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceImageDto)
  evidenceImages?: EvidenceImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingSettlementInputDto)
  bookingSettlements?: BookingSettlementInputDto[];
}

export class SettlementSummaryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsString()
  guideId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unpaidOnly?: boolean;
}

export class ExportGuidePaymentDto {
  @IsString()
  guideId: string;

  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class GuidePaymentPeriodsQueryDto {
  @IsOptional()
  @IsString()
  guideId?: string;
}
