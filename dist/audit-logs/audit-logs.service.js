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
exports.AuditLogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AuditLogsService = class AuditLogsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query, actor) {
        const { page, limit, q, entityType, entityId, action, changedBy, from, to } = query;
        const where = {};
        if (q) {
            where.OR = [
                { entityType: { contains: q, mode: 'insensitive' } },
                { entityId: { contains: q, mode: 'insensitive' } },
                { action: { contains: q, mode: 'insensitive' } },
                { changedBy: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (entityType)
            where.entityType = entityType;
        if (entityId)
            where.entityId = entityId;
        if (action)
            where.action = { contains: action };
        if (changedBy)
            where.changedBy = changedBy;
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = new Date(from);
            if (to)
                where.createdAt.lte = new Date(to);
        }
        if (actor.role !== client_1.RoleType.ADMIN) {
            where.changedBy = actor.id;
        }
        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                include: { user: { select: { id: true, email: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return { items, total, page, limit };
    }
};
exports.AuditLogsService = AuditLogsService;
exports.AuditLogsService = AuditLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditLogsService);
//# sourceMappingURL=audit-logs.service.js.map