import { NotificationType } from '@prisma/client';
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
