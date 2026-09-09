import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransportationVehicleDto {
  @IsString()
  providerId: string;

  @IsString()
  plateNumber: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  capacity?: number;

  @IsOptional()
  @IsString()
  brand?: string;
}

export class UpdateTransportationVehicleDto {
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  plateNumber?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  capacity?: number;

  @IsOptional()
  @IsString()
  brand?: string;
}

export class AssignDriverToProviderDto {
  @IsString()
  userId: string;
}