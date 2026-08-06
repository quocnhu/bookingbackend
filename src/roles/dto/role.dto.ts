import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

export class QueryRoleDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;
}
