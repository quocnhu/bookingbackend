import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCoordinateDto {
  @IsString()
  hotelName: string;

  @IsString()
  @IsOptional()
  starRating?: string;

  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  coordinate?: string;

  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;
}

export class UpdateCoordinateDto {
  @IsString()
  @IsOptional()
  hotelName?: string;

  @IsString()
  @IsOptional()
  starRating?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  coordinate?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;
}

export class QueryCoordinateDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  q?: string;
}
