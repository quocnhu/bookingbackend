import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsSafeUrl } from '@/common/validators/is-safe-url.validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsSafeUrl()
  avatarUrl?: string;
}
