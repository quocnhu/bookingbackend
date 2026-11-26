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
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const notifications_gateway_1 = require("./notifications.gateway");
const client_1 = require("@prisma/client");
const ROLE_LABELS = {
    ADMIN: 'Admin',
    OFFICE: 'Office',
    TOUR_GUIDE: 'Tour Guide',
    DRIVER: 'Driver',
    TRANSPORT_PROVIDER: 'Transport Provider',
    TOURIST: 'Tourist',
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
        const notifications = await this.prisma.notification.findMany({
            where: { userId, ...(unreadOnly ? { read: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return this.attachSenders(notifications);
    }
    async attachSenders(notifications) {
        const senderIds = [
            ...new Set(notifications.map((n) => n.data?.fromUserId).filter(Boolean)),
        ];
        if (senderIds.length === 0)
            return notifications;
        const users = await this.prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, name: true, email: true },
        });
        const byId = new Map(users.map((u) => [u.id, u]));
        return notifications.map((n) => {
            const fromUserId = n.data?.fromUserId;
            const sender = byId.get(fromUserId);
            return sender ? { ...n, sender } : n;
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
        const actorInfo = await this.prisma.user.findUnique({
            where: { id: actor.id },
            select: { id: true, name: true, email: true, role: true },
        });
        const sender = actorInfo ?? {
            id: actor.id,
            name: actor.name ?? actor.email ?? 'System',
            email: actor.email ?? null,
            role: actor.role,
        };
        const batchId = (0, crypto_1.randomUUID)();
        const created = [];
        for (const userId of recipientIds) {
            const notif = await this.create(userId, type, dto.title, dto.body, {
                fromUserId: actor.id,
                fromRole: sender.role,
                toRoleTypes: dto.roleTypes ?? [],
                batchId,
            });
            const enriched = { ...notif, sender };
            this.gateway.notifyUser(userId, 'notification', enriched);
            created.push(enriched);
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
    async getLog(query, actor) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            data: { path: ['fromUserId'], not: client_1.Prisma.DbNull },
        };
        if (query.recipientRole) {
            where.user = { role: query.recipientRole };
        }
        if (query.search?.trim()) {
            const q = query.search.trim();
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { body: { contains: q, mode: 'insensitive' } },
                { user: { name: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
            ];
        }
        const rows = await this.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 500,
            select: {
                id: true,
                type: true,
                title: true,
                body: true,
                data: true,
                createdAt: true,
                read: true,
                user: { select: { id: true, name: true, email: true, role: true } },
            },
        });
        const senderIds = [
            ...new Set(rows.map((r) => r.data?.fromUserId).filter(Boolean)),
        ];
        const senders = senderIds.length
            ? await this.prisma.user.findMany({
                where: { id: { in: senderIds } },
                select: { id: true, name: true, email: true, role: true },
            })
            : [];
        const senderById = new Map(senders.map((s) => [s.id, s]));
        const grouped = new Map();
        for (const row of rows) {
            const data = row.data ?? {};
            const sender = senderById.get(data.fromUserId);
            const senderRole = sender?.role ?? data.fromRole ?? null;
            if (query.senderRole && senderRole !== query.senderRole)
                continue;
            const key = data.batchId ??
                [
                    data.fromUserId ?? 'unknown',
                    row.createdAt.toISOString(),
                    row.type,
                    row.title,
                    row.body,
                ].join('|');
            const existing = grouped.get(key);
            const recipient = {
                id: row.user.id,
                name: row.user.name,
                email: row.user.email,
                role: row.user.role,
                read: row.read,
            };
            if (existing) {
                if (!existing.recipients.some((r) => r.id === recipient.id)) {
                    existing.recipients.push(recipient);
                }
                continue;
            }
            grouped.set(key, {
                id: row.id,
                createdAt: row.createdAt,
                type: row.type,
                title: row.title,
                body: row.body,
                sender: sender ?? (data.fromUserId ? { id: data.fromUserId, role: senderRole } : null),
                recipients: [recipient],
                toRoleTypes: Array.isArray(data.toRoleTypes) ? data.toRoleTypes : [],
            });
        }
        const items = [...grouped.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const total = items.length;
        const start = (page - 1) * limit;
        return {
            items: items.slice(start, start + limit).map((item) => ({
                ...item,
                recipientCount: item.recipients.length,
            })),
            total,
            page,
            limit,
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