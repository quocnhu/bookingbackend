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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuideHoldsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const notification_service_1 = require("../notifications/notification.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
let GuideHoldsService = class GuideHoldsService {
    prisma;
    audit;
    notificationService;
    gateway;
    constructor(prisma, audit, notificationService, gateway) {
        this.prisma = prisma;
        this.audit = audit;
        this.notificationService = notificationService;
        this.gateway = gateway;
    }
    include = {
        guide: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        releasedBy: { select: { id: true, name: true, email: true } },
    };
    async mine(actor) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.prisma.guideHold.findMany({
            where: {
                guideId: actor.id,
                status: client_1.GuideHoldStatus.ACTIVE,
                endDate: { gte: today },
            },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                note: true,
                status: true,
            },
            orderBy: { startDate: 'asc' },
            take: 50,
        });
    }
    async list(query) {
        const where = {};
        if (query.guideId)
            where.guideId = query.guideId;
        if (query.status)
            where.status = query.status;
        if (query.from || query.to) {
            if (query.from) {
                where.endDate = { gte: this.startOfDay(new Date(query.from)) };
            }
            if (query.to) {
                where.startDate = { lte: this.endOfDay(new Date(query.to)) };
            }
        }
        return this.prisma.guideHold.findMany({
            where,
            include: this.include,
            orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
            take: 500,
        });
    }
    async create(dto, actor) {
        const { start, end } = this.normalizeRange(dto.startDate, dto.endDate);
        const guide = await this.prisma.user.findUnique({
            where: { id: dto.guideId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
            },
        });
        if (!guide)
            throw new common_1.NotFoundException('Tour guide not found');
        if (guide.role !== client_1.RoleType.TOUR_GUIDE) {
            throw new common_1.BadRequestException('The selected user is not a tour guide');
        }
        if (!guide.isActive) {
            throw new common_1.BadRequestException('The selected tour guide is inactive');
        }
        await this.assertNoOverlap(guide.id, start, end);
        const hold = await this.prisma.guideHold.create({
            data: {
                guideId: guide.id,
                startDate: start,
                endDate: end,
                note: dto.note?.trim() || null,
                createdById: actor.id,
            },
            include: this.include,
        });
        await this.audit.log({
            entityType: 'GuideHold',
            entityId: hold.id,
            action: 'CREATE_GUIDE_HOLD',
            afterData: {
                guideId: hold.guideId,
                startDate: hold.startDate,
                endDate: hold.endDate,
                note: hold.note,
            },
            changedBy: actor.id,
        });
        await this.notifyGuide(hold.guideId, 'Schedule hold', `${this.formatRange(hold.startDate, hold.endDate)} — ${hold.note || 'Reserved by the operator'}. You cannot be assigned to tours during these dates.`, { kind: 'GUIDE_HOLD', holdId: hold.id });
        return hold;
    }
    async update(id, dto, actor) {
        const existing = await this.prisma.guideHold.findUnique({
            where: { id },
        });
        if (!existing)
            throw new common_1.NotFoundException('Guide hold not found');
        if (existing.status === client_1.GuideHoldStatus.RELEASED) {
            throw new common_1.BadRequestException('This hold has already been released');
        }
        const { start, end } = this.normalizeRange(dto.startDate ?? existing.startDate, dto.endDate ?? existing.endDate);
        await this.assertNoOverlap(existing.guideId, start, end, existing.id);
        const hold = await this.prisma.guideHold.update({
            where: { id },
            data: {
                startDate: start,
                endDate: end,
                note: dto.note !== undefined ? dto.note?.trim() || null : undefined,
            },
            include: this.include,
        });
        await this.audit.log({
            entityType: 'GuideHold',
            entityId: id,
            action: 'UPDATE_GUIDE_HOLD',
            beforeData: existing,
            afterData: hold,
            changedBy: actor.id,
        });
        await this.notifyGuide(hold.guideId, 'Schedule hold updated', `${this.formatRange(hold.startDate, hold.endDate)} — ${hold.note || 'Reserved by the operator'}.`, { kind: 'GUIDE_HOLD_UPDATED', holdId: hold.id });
        return hold;
    }
    async release(id, actor) {
        const existing = await this.prisma.guideHold.findUnique({
            where: { id },
        });
        if (!existing)
            throw new common_1.NotFoundException('Guide hold not found');
        if (existing.status === client_1.GuideHoldStatus.RELEASED)
            return existing;
        const hold = await this.prisma.guideHold.update({
            where: { id },
            data: {
                status: client_1.GuideHoldStatus.RELEASED,
                releasedAt: new Date(),
                releasedById: actor.id,
            },
            include: this.include,
        });
        await this.audit.log({
            entityType: 'GuideHold',
            entityId: id,
            action: 'RELEASE_GUIDE_HOLD',
            beforeData: existing,
            afterData: hold,
            changedBy: actor.id,
        });
        await this.notifyGuide(hold.guideId, 'Schedule hold released', `${this.formatRange(hold.startDate, hold.endDate)} is no longer held. You can be assigned again.`, { kind: 'GUIDE_HOLD_RELEASED', holdId: hold.id });
        return hold;
    }
    async assertNoOverlap(guideId, start, end, excludeId) {
        const overlap = await this.prisma.guideHold.findFirst({
            where: {
                guideId,
                status: client_1.GuideHoldStatus.ACTIVE,
                startDate: { lte: end },
                endDate: { gte: start },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true, startDate: true, endDate: true },
        });
        if (overlap) {
            throw new common_1.BadRequestException(`This guide already has an active hold from ${this.formatDate(overlap.startDate)} to ${this.formatDate(overlap.endDate)}.`);
        }
    }
    normalizeRange(startValue, endValue) {
        const start = this.startOfDay(new Date(startValue));
        const end = this.endOfDay(new Date(endValue));
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new common_1.BadRequestException('Invalid hold dates');
        }
        if (start.getTime() > end.getTime()) {
            throw new common_1.BadRequestException('End date must be on or after the start date');
        }
        return { start, end };
    }
    startOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    endOfDay(date) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-GB');
    }
    formatRange(start, end) {
        return `${this.formatDate(start)} → ${this.formatDate(end)}`;
    }
    async notifyGuide(guideId, title, body, data) {
        const notification = await this.notificationService.create(guideId, client_1.NotificationType.GENERAL, title, body, { ...data, url: '/tour-guide/my-trips' });
        this.gateway.notifyUser(guideId, 'notification', notification);
        this.gateway.notifyAll('board:refresh', { action: 'guide_hold' });
    }
};
exports.GuideHoldsService = GuideHoldsService;
exports.GuideHoldsService = GuideHoldsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway])
], GuideHoldsService);
//# sourceMappingURL=guide-holds.service.js.map