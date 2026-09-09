import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsSafeUrl } from '@/common/validators/is-safe-url.validator';
import { RoleType } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsSafeUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;

  @IsOptional()
  @IsString()
  userType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsSafeUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;

  @IsOptional()
  @IsString()
  userType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  storageQuotaMb?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

export class UpdateUserRoleDto {
  @IsArray()
  @IsString({ each: true })
  roleIds: string[];

  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}

export class QueryUserDto extends PaginationDto {
  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;

  @IsOptional()
  @IsString()
  userType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
