import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AssignmentStatus } from '@prisma/client';

export class CreateAssignmentDto {
  @IsOptional()
  @IsString()
  code?: string;

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

export class AssignBookingsDto {
  @IsArray()
  @IsString({ each: true })
  bookingIds: string[];
}

export class QueryAssignmentDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;

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
}
