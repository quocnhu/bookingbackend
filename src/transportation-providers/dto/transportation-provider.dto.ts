import { IsBoolean, IsEmail, IsInt, IsOptional, IsString } from 'class-validator';
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

export class CreateDriverDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  licenseNumber: string;

  @IsOptional()
  @IsString()
  providerId?: string;
}

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}