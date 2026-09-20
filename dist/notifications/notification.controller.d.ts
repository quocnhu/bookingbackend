import { NotificationService } from './notification.service';
import { RegisterPushDto, SendNotificationDto, NotificationTargetsQueryDto } from './dto/notification.dto';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    findAll(actor: AuthenticatedUser, unread?: string): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        type: import("@prisma/client").$Enums.NotificationType;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }[]>;
    targets(query: NotificationTargetsQueryDto): Promise<{
        roleGroups: {
            key: import("@prisma/client").$Enums.RoleType;
            label: string;
            count: number;
        }[];
        users: {
            id: string;
            name: string | null;
            email: string;
            role: import("@prisma/client").$Enums.RoleType;
        }[];
    }>;
    unreadCount(actor: AuthenticatedUser): Promise<{
        count: number;
    }>;
    markRead(id: string): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        type: import("@prisma/client").$Enums.NotificationType;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }>;
    markAllRead(actor: AuthenticatedUser): Promise<import("@prisma/client").Prisma.BatchPayload>;
    send(dto: SendNotificationDto, actor: AuthenticatedUser): Promise<{
        sent: number;
        recipients: string[];
    }>;
    registerPush(actor: AuthenticatedUser, dto: RegisterPushDto): Promise<{
        id: string;
        createdAt: Date;
        userAgent: string | null;
        userId: string;
        active: boolean;
        endpoint: string;
    }>;
    removePush(actor: AuthenticatedUser, endpoint: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
