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
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let NotificationService = NotificationService_1 = class NotificationService {
    prisma;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
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
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map