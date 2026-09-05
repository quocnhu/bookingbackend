import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoutePriceDto {
  @IsString()
  tourId: string;

  @IsString()
  providerId: string;

  @IsString()
  vehicleId: string;

  @IsNumber()
  @Type(() => Number)
  price: number;
}

export class UpdateRoutePriceDto {
  @IsOptional()
  @IsString()
  tourId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price?: number;
}

export class QueryRoutePriceDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  tourId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;
}
