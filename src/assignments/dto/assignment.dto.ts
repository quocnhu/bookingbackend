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
import {
  AssignmentOrigin,
  AssignmentStatus,
  TourReportStatus,
} from '@prisma/client';

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

/** Enable/disable the creation source for all assignments on the Dispatch Board (Manual / Auto). */
export class SetBoardOriginDto {
  @IsEnum(AssignmentOrigin)
  origin: AssignmentOrigin;
}

export class AssignBookingsDto {
  @IsArray()
  @IsString({ each: true })
  bookingIds: string[];
}

/** Reorder passengers within a bus (drag-and-drop, bookingflow.md step 3). */
export class ReorderBookingsDto {
  @IsArray()
  @IsString({ each: true })
  bookingIds: string[];
}

/** Move a booking to another bus (drag-and-drop). */
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

  // Receipt images uploaded by the guide (from POST /assignments/:id/tour-report/images)
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

export class FinalizeAssignmentDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceImageDto)
  evidenceImages?: EvidenceImageDto[];
}
