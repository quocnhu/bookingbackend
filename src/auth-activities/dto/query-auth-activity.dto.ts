import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryAuthActivityDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
