import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationType, RoleType } from '@prisma/client';

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

export class SendNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsArray()
  roleTypes?: RoleType[];

  @IsOptional()
  @IsArray()
  userIds?: string[];
}

export class NotificationTargetsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
