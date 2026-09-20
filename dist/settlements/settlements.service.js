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
exports.SettlementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("@/prisma/prisma.service");
const audit_service_1 = require("@/audit/audit.service");
const client_1 = require("@prisma/client");
let SettlementsService = class SettlementsService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    include = {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
        booking: { select: { id: true, bookingRef: true, customerName: true, totalPax: true, payment: true } },
        assignment: { select: { id: true, code: true, tourName: true, status: true } },
    };
    async listCategories() {
        return this.prisma.settlementCategory.findMany({ orderBy: { name: 'asc' } });
    }
    async createCategory(dto) {
        const category = await this.prisma.settlementCategory.create({ data: dto });
        await this.auditService.log({
            entityType: 'SettlementCategory',
            entityId: category.id,
            action: 'CREATE',
            changedBy: undefined,
            afterData: category,
        });
        return category;
    }
    async removeCategory(id) {
        const count = await this.prisma.settlement.count({ where: { categoryId: id } });
        if (count > 0) {
            throw new common_1.BadRequestException('Category is in use by some settlements');
        }
        await this.prisma.settlementCategory.delete({ where: { id } });
        return { message: 'Category deleted' };
    }
    async findAll(query, actor) {
        const { page, limit, bookingId, assignmentId, categoryId } = query;
        const where = {};
        if (bookingId)
            where.bookingId = bookingId;
        if (assignmentId)
            where.assignmentId = assignmentId;
        if (categoryId)
            where.categoryId = categoryId;
        if (actor.role !== client_1.RoleType.ADMIN) {
            where.createdById = actor.id;
        }
        const [items, total] = await Promise.all([
            this.prisma.settlement.findMany({
                where,
                include: this.include,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.settlement.count({ where }),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id) {
        const settlement = await this.prisma.settlement.findUnique({
            where: { id },
            include: this.include,
        });
        if (!settlement)
            throw new common_1.NotFoundException('Settlement not found');
        return settlement;
    }
    async create(dto, actor) {
        if (!dto.bookingId && !dto.assignmentId) {
            throw new common_1.BadRequestException('A settlement must belong to either a booking (layer 1) or an assignment (layer 2)');
        }
        const settlement = await this.prisma.settlement.create({
            data: {
                amount: dto.amount,
                note: dto.note,
                imageUrl: dto.imageUrl,
                categoryId: dto.categoryId,
                customCategoryName: dto.customCategoryName,
                bookingId: dto.bookingId,
                assignmentId: dto.assignmentId,
                createdById: actor.id,
            },
        });
        await this.auditService.log({
            entityType: 'Settlement',
            entityId: settlement.id,
            action: 'CREATE',
            afterData: settlement,
            changedBy: actor.id,
        });
        return this.findOne(settlement.id);
    }
    async update(id, dto) {
        const before = await this.findOne(id);
        const settlement = await this.prisma.settlement.update({
            where: { id },
            data: {
                amount: dto.amount,
                note: dto.note,
                imageUrl: dto.imageUrl,
                categoryId: dto.categoryId,
                customCategoryName: dto.customCategoryName,
            },
        });
        await this.auditService.log({
            entityType: 'Settlement',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: settlement,
        });
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.settlement.delete({ where: { id } });
        await this.auditService.log({ entityType: 'Settlement', entityId: id, action: 'DELETE' });
        return { message: 'Settlement deleted' };
    }
    async exportByProvider(providerId, startDate, endDate) {
        const assignmentWhere = { providerId };
        if (startDate || endDate) {
            assignmentWhere.startDate = {};
            if (startDate)
                assignmentWhere.startDate.gte = new Date(startDate);
            if (endDate)
                assignmentWhere.startDate.lte = new Date(endDate);
        }
        const assignments = await this.prisma.assignment.findMany({
            where: assignmentWhere,
            include: {
                driver: { select: { id: true, name: true, email: true } },
                vehicle: { select: { id: true, plateNumber: true, capacity: true } },
                bookings: { select: { id: true, bookingRef: true, customerName: true, totalPax: true } },
                settlements: true,
            },
            orderBy: { startDate: 'desc' },
        });
        const provider = await this.prisma.transportationProvider.findUnique({
            where: { id: providerId },
            select: { id: true, name: true },
        });
        const driverMap = new Map();
        for (const a of assignments) {
            const driverId = a.driverId ?? 'unknown';
            if (!driverMap.has(driverId)) {
                driverMap.set(driverId, {
                    driver: a.driver,
                    assignments: [],
                    totalAmount: 0,
                });
            }
            const entry = driverMap.get(driverId);
            const totalSettlement = (a.settlements ?? []).reduce((sum, s) => sum + Number(s.amount ?? 0), 0);
            entry.assignments.push({
                id: a.id,
                code: a.code,
                tourName: a.tourName,
                vehicle: a.vehicle,
                bookingCount: a.bookings?.length ?? 0,
                totalAmount: totalSettlement,
                status: a.status,
                createdAt: a.createdAt,
            });
            entry.totalAmount += totalSettlement;
        }
        return {
            provider,
            period: { startDate, endDate },
            drivers: Array.from(driverMap.values()),
            totalAmount: assignments.reduce((sum, a) => sum + (a.settlements ?? []).reduce((s, st) => s + Number(st.amount ?? 0), 0), 0),
        };
    }
};
exports.SettlementsService = SettlementsService;
exports.SettlementsService = SettlementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SettlementsService);
//# sourceMappingURL=settlements.service.js.map