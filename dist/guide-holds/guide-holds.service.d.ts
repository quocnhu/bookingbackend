import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateGuideHoldDto, QueryGuideHoldDto, UpdateGuideHoldDto } from './dto/guide-hold.dto';
export declare class GuideHoldsService {
    private readonly prisma;
    private readonly audit;
    private readonly notificationService;
    private readonly gateway;
    constructor(prisma: PrismaService, audit: AuditService, notificationService: NotificationService, gateway: NotificationsGateway);
    private include;
    mine(actor: AuthenticatedUser): Promise<{
        id: string;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
    }[]>;
    list(query: QueryGuideHoldDto): Promise<({
        guide: {
            name: string | null;
            id: string;
            email: string;
        };
        createdBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
        releasedBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
    } & {
        updatedAt: Date;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        guideId: string;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
        createdById: string | null;
        releasedById: string | null;
        releasedAt: Date | null;
    })[]>;
    create(dto: CreateGuideHoldDto, actor: AuthenticatedUser): Promise<{
        guide: {
            name: string | null;
            id: string;
            email: string;
        };
        createdBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
        releasedBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
    } & {
        updatedAt: Date;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        guideId: string;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
        createdById: string | null;
        releasedById: string | null;
        releasedAt: Date | null;
    }>;
    update(id: string, dto: UpdateGuideHoldDto, actor: AuthenticatedUser): Promise<{
        guide: {
            name: string | null;
            id: string;
            email: string;
        };
        createdBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
        releasedBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
    } & {
        updatedAt: Date;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        guideId: string;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
        createdById: string | null;
        releasedById: string | null;
        releasedAt: Date | null;
    }>;
    release(id: string, actor: AuthenticatedUser): Promise<{
        updatedAt: Date;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        guideId: string;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
        createdById: string | null;
        releasedById: string | null;
        releasedAt: Date | null;
    }>;
    private assertNoOverlap;
    private normalizeRange;
    private startOfDay;
    private endOfDay;
    private formatDate;
    private formatRange;
    private notifyGuide;
}
