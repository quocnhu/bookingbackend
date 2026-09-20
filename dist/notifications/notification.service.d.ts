import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { SendNotificationDto } from './dto/notification.dto';
export declare class NotificationService {
    private readonly prisma;
    private readonly auditService;
    private readonly gateway;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, gateway: NotificationsGateway);
    create(userId: string, type: NotificationType, title: string, body: string, data?: Record<string, any>): Promise<{
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue | null;
        type: import("@prisma/client").$Enums.NotificationType;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }>;
    findAll(userId: string, unreadOnly?: boolean): Promise<{
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue | null;
        type: import("@prisma/client").$Enums.NotificationType;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }[]>;
    unreadCount(userId: string): Promise<number>;
    markRead(id: string): Promise<{
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue | null;
        type: import("@prisma/client").$Enums.NotificationType;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }>;
    markAllRead(userId: string): Promise<Prisma.BatchPayload>;
    registerPush(userId: string, endpoint: string, userAgent?: string): Promise<{
        id: string;
        createdAt: Date;
        userAgent: string | null;
        userId: string;
        active: boolean;
        endpoint: string;
    }>;
    removePush(userId: string, endpoint: string): Promise<Prisma.BatchPayload>;
    getPushTokens(userId: string): Promise<{
        endpoint: string;
    }[]>;
    getTargets(search?: string): Promise<{
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
    send(dto: SendNotificationDto, actor: AuthenticatedUser): Promise<{
        sent: number;
        recipients: string[];
    }>;
}
