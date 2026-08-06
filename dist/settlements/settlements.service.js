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
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
let SettlementsService = class SettlementsService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    include = {
        assignment: true,
        provider: true,
        user: { select: { id: true, name: true, email: true } },
        expenseItems: true,
    };
    async findAll(query, actor) {
        const { page, limit, status, payeeType } = query;
        const where = {};
        if (status)
            where.status = status;
        if (payeeType)
            where.payeeType = payeeType;
        if (actor.role !== client_1.RoleType.ADMIN) {
            where.OR = [{ userId: actor.id }, { providerId: actor.providerId }];
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
    async create(dto) {
        const existing = await this.prisma.settlement.findUnique({
            where: { assignmentId: dto.assignmentId },
        });
        if (existing)
            throw new common_1.BadRequestException('Settlement already exists for this assignment');
        const finalAmount = dto.baseAmount + (dto.allowance ?? 0) - (dto.deduction ?? 0);
        const settlement = await this.prisma.settlement.create({
            data: {
                assignmentId: dto.assignmentId,
                payeeType: dto.payeeType,
                providerId: dto.providerId,
                userId: dto.userId,
                baseAmount: dto.baseAmount,
                allowance: dto.allowance ?? 0,
                deduction: dto.deduction ?? 0,
                finalAmount,
                periodName: dto.periodName,
                notes: dto.notes,
                expenseItems: dto.expenseItems?.length
                    ? { create: dto.expenseItems }
                    : undefined,
            },
        });
        await this.auditService.log({
            entityType: 'Settlement',
            entityId: settlement.id,
            action: 'CREATE',
            afterData: settlement,
        });
        return this.findOne(settlement.id);
    }
    async update(id, dto) {
        const before = await this.findOne(id);
        const data = {
            allowance: dto.allowance,
            deduction: dto.deduction,
            periodName: dto.periodName,
            notes: dto.notes,
        };
        if (dto.allowance !== undefined || dto.deduction !== undefined) {
            const allowance = dto.allowance ?? Number(before.allowance);
            const deduction = dto.deduction ?? Number(before.deduction);
            data.finalAmount = Number(before.baseAmount) + allowance - deduction;
        }
        const settlement = await this.prisma.settlement.update({ where: { id }, data });
        await this.auditService.log({
            entityType: 'Settlement',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: settlement,
        });
        return this.findOne(id);
    }
    async updateStatus(id, status) {
        const before = await this.findOne(id);
        const settlement = await this.prisma.settlement.update({ where: { id }, data: { status } });
        await this.auditService.log({
            entityType: 'Settlement',
            entityId: id,
            action: `UPDATE_STATUS:${status}`,
            beforeData: { status: before.status },
            afterData: { status },
        });
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.settlement.delete({ where: { id } });
        await this.auditService.log({ entityType: 'Settlement', entityId: id, action: 'DELETE' });
        return { message: 'Settlement deleted' };
    }
};
exports.SettlementsService = SettlementsService;
exports.SettlementsService = SettlementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SettlementsService);
//# sourceMappingURL=settlements.service.js.map