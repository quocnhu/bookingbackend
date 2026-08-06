import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class CreatePermissionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  group?: string;
}

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  group?: string;
}

export class QueryPermissionDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;
}
