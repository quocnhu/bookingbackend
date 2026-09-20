"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("@/prisma/prisma.service");
const audit_service_1 = require("@/audit/audit.service");
const notifications_gateway_1 = require("./notifications.gateway");
const client_1 = require("@prisma/client");
const ROLE_LABELS = {
    ADMIN: 'Admin',
    OFFICE: 'Office',
    TOUR_GUIDE: 'Tour Guide',
    DRIVER: 'Driver',
    TRANSPORT_PROVIDER: 'Transport Provider',
    CUSTOMER: 'Customer',
};
let NotificationService = NotificationService_1 = class NotificationService {
    prisma;
    auditService;
    gateway;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(prisma, auditService, gateway) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.gateway = gateway;
    }
    async create(userId, type, title, body, data) {
        const notification = await this.prisma.notification.create({
            data: { userId, type, title, body, data: data ?? client_1.Prisma.JsonNull },
        });
        this.logger.log(`Notification [${type}] → ${userId}: ${title}`);
        return notification;
    }
    async findAll(userId, unreadOnly = false) {
        return this.prisma.notification.findMany({
            where: { userId, ...(unreadOnly ? { read: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async unreadCount(userId) {
        return this.prisma.notification.count({ where: { userId, read: false } });
    }
    async markRead(id) {
        return this.prisma.notification.update({ where: { id }, data: { read: true } });
    }
    async markAllRead(userId) {
        return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    }
    async registerPush(userId, endpoint, userAgent) {
        return this.prisma.pushSubscription.upsert({
            where: { userId_endpoint: { userId, endpoint } },
            update: { active: true, userAgent },
            create: { userId, endpoint, userAgent },
        });
    }
    async removePush(userId, endpoint) {
        return this.prisma.pushSubscription.updateMany({
            where: { userId, endpoint },
            data: { active: false },
        });
    }
    async getPushTokens(userId) {
        return this.prisma.pushSubscription.findMany({
            where: { userId, active: true },
            select: { endpoint: true },
        });
    }
    async getTargets(search) {
        const groups = await this.prisma.user.groupBy({
            by: ['role'],
            where: { isActive: true },
            _count: { _all: true },
            orderBy: { _count: { role: 'desc' } },
        });
        const roleGroups = groups
            .filter((g) => g._count._all > 0)
            .map((g) => ({
            key: g.role,
            label: ROLE_LABELS[g.role] ?? g.role,
            count: g._count._all,
        }));
        const users = await this.prisma.user.findMany({
            where: {
                isActive: true,
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            select: { id: true, name: true, email: true, role: true },
            orderBy: [{ name: 'asc' }],
            take: 100,
        });
        return { roleGroups, users };
    }
    async send(dto, actor) {
        const recipientIds = new Set(dto.userIds ?? []);
        if (dto.roleTypes?.length) {
            const byRole = await this.prisma.user.findMany({
                where: { isActive: true, role: { in: dto.roleTypes } },
                select: { id: true },
            });
            for (const u of byRole)
                recipientIds.add(u.id);
        }
        if (recipientIds.size === 0) {
            throw new common_1.BadRequestException('No recipients selected');
        }
        const type = dto.type ?? client_1.NotificationType.GENERAL;
        const created = [];
        for (const userId of recipientIds) {
            const notif = await this.create(userId, type, dto.title, dto.body, {
                fromUserId: actor.id,
            });
            this.gateway.notifyUser(userId, 'notification', notif);
            created.push(notif);
        }
        this.auditService.log({
            entityType: 'Notification',
            entityId: dto.title || 'notification',
            action: 'SEND',
            afterData: {
                recipients: recipientIds.size,
                roleTypes: dto.roleTypes ?? [],
                userIds: dto.userIds ?? [],
            },
            changedBy: actor.id,
        });
        return {
            sent: recipientIds.size,
            recipients: [...recipientIds],
        };
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        notifications_gateway_1.NotificationsGateway])
], NotificationService);
//# sourceMappingURL=notification.service.js.map