import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsSafeUrl } from '@/common/validators/is-safe-url.validator';
import { DriverType, GuideType, RoleType } from '@prisma/client';

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
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];

  @IsOptional()
  @IsString()
  hotelId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  hotelCommissionPercent?: number;

  @IsOptional()
  @IsString()
  providerId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateGuideProfileDto)
  guideProfile?: UpdateGuideProfileDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDriverProfileDto)
  driverProfile?: UpdateDriverProfileDto | null;
}

export class UpdateGuideProfileDto {
  @IsOptional()
  @IsEnum(GuideType)
  type?: GuideType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;
}

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsEnum(DriverType)
  type?: DriverType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;
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
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  storageQuotaMb?: number;

  @IsOptional()
  @IsString()
  hotelId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  hotelCommissionPercent?: number;

  @IsOptional()
  @IsString()
  providerId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateGuideProfileDto)
  guideProfile?: UpdateGuideProfileDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDriverProfileDto)
  driverProfile?: UpdateDriverProfileDto | null;

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
  @IsBoolean()
  isActive?: boolean;
}
