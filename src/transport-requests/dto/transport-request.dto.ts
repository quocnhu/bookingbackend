import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ProviderAssignmentMode, TransportRequestStatus } from '@prisma/client';

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class SendTransportRequestDto {
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  deadline?: string;
}

export class CancelTransportRequestDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class OverrideTransportRequestDto {
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsString()
  driverId: string;

  @IsString()
  vehicleId: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignTransportRequestDto {
  @IsString()
  driverId: string;

  @IsString()
  vehicleId: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class DeclineTransportRequestDto {
  @IsString()
  reason: string;
}

export class UpdateTransportRequestSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  @Type(() => Number)
  sendDaysBefore?: number;

  @IsOptional()
  @IsString()
  @Matches(HHMM_PATTERN, { message: 'sendTime must be HH:mm' })
  sendTime?: string;

  @IsOptional()
  @IsString()
  @Matches(HHMM_PATTERN, { message: 'deadlineTime must be HH:mm' })
  deadlineTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(72)
  @Type(() => Number)
  minLeadHours?: number;
}

export class UpdateProviderAssignmentModeDto {
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsEnum(ProviderAssignmentMode)
  assignmentMode: ProviderAssignmentMode;
}

export class QueryTransportRequestDto {
  @IsOptional()
  @IsEnum(TransportRequestStatus)
  status?: TransportRequestStatus;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
