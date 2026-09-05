import { PrismaService } from "../prisma/prisma.service";
import { NotificationType, Prisma } from '@prisma/client';
export declare class NotificationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(userId: string, type: NotificationType, title: string, body: string, data?: Record<string, any>): Promise<{
        type: import("@prisma/client").$Enums.NotificationType;
        data: Prisma.JsonValue | null;
        id: string;
        createdAt: Date;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }>;
    findAll(userId: string, unreadOnly?: boolean): Promise<{
        type: import("@prisma/client").$Enums.NotificationType;
        data: Prisma.JsonValue | null;
        id: string;
        createdAt: Date;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }[]>;
    unreadCount(userId: string): Promise<number>;
    markRead(id: string): Promise<{
        type: import("@prisma/client").$Enums.NotificationType;
        data: Prisma.JsonValue | null;
        id: string;
        createdAt: Date;
        userId: string;
        body: string;
        title: string;
        read: boolean;
    }>;
    markAllRead(userId: string): Promise<Prisma.BatchPayload>;
    registerPush(userId: string, endpoint: string, userAgent?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        endpoint: string;
        active: boolean;
    }>;
    removePush(userId: string, endpoint: string): Promise<Prisma.BatchPayload>;
    getPushTokens(userId: string): Promise<{
        endpoint: string;
    }[]>;
}
