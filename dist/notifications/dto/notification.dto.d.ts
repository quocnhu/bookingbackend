import { NotificationType, RoleType } from '@prisma/client';
export declare class CreateNotificationDto {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
}
export declare class RegisterPushDto {
    endpoint: string;
    userAgent?: string;
}
export declare class SendNotificationDto {
    title: string;
    body: string;
    type?: NotificationType;
    roleTypes?: RoleType[];
    userIds?: string[];
}
export declare class NotificationTargetsQueryDto {
    search?: string;
}
