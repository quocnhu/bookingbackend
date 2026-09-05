import { IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  data?: Record<string, any>;
}

export class RegisterPushDto {
  @IsString()
  endpoint: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
