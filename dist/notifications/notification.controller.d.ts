import { NotificationService } from './notification.service';
import { RegisterPushDto } from './dto/notification.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    findAll(actor: AuthenticatedUser, unread?: string): Promise<{
        type: import("@prisma/client").$Enums.NotificationType;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }[]>;
    unreadCount(actor: AuthenticatedUser): Promise<{
        count: number;
    }>;
    markRead(id: string): Promise<{
        type: import("@prisma/client").$Enums.NotificationType;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }>;
    markAllRead(actor: AuthenticatedUser): Promise<import("@prisma/client").Prisma.BatchPayload>;
    registerPush(actor: AuthenticatedUser, dto: RegisterPushDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        endpoint: string;
        active: boolean;
    }>;
    removePush(actor: AuthenticatedUser, endpoint: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
