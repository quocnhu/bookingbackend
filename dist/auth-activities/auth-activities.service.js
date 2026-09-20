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
exports.AuthActivitiesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("@/prisma/prisma.service");
const client_1 = require("@prisma/client");
let AuthActivitiesService = class AuthActivitiesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(input) {
        try {
            await this.prisma.authActivity.create({
                data: {
                    userId: input.userId ?? null,
                    eventType: input.eventType,
                    authProvider: input.authProvider,
                    ipAddress: input.ipAddress,
                    userAgent: input.userAgent,
                },
            });
        }
        catch {
        }
    }
    async findAll(query, actor) {
        const { page, limit, eventType, userId, from, to } = query;
        const where = {};
        if (eventType)
            where.eventType = eventType;
        if (userId)
            where.userId = userId;
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = new Date(from);
            if (to)
                where.createdAt.lte = new Date(to);
        }
        if (actor.role !== client_1.RoleType.ADMIN) {
            where.userId = actor.id;
        }
        const [items, total] = await Promise.all([
            this.prisma.authActivity.findMany({
                where,
                include: { user: { select: { id: true, email: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.authActivity.count({ where }),
        ]);
        return { items, total, page, limit };
    }
};
exports.AuthActivitiesService = AuthActivitiesService;
exports.AuthActivitiesService = AuthActivitiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthActivitiesService);
//# sourceMappingURL=auth-activities.service.js.map