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
exports.PartnersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let PartnersService = class PartnersService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    list(search, includeInactive = false) {
        const q = search?.trim();
        return this.prisma.partnerAgency.findMany({
            where: {
                ...(includeInactive ? {} : { isActive: true }),
                ...(q
                    ? {
                        OR: [
                            { name: { contains: q, mode: 'insensitive' } },
                            { contactName: { contains: q, mode: 'insensitive' } },
                            { phone: { contains: q, mode: 'insensitive' } },
                            { email: { contains: q, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
            include: { _count: { select: { assignments: true, partnerPayments: true } } },
        });
    }
    async findOne(id) {
        const partner = await this.prisma.partnerAgency.findUnique({
            where: { id },
            include: { _count: { select: { assignments: true, partnerPayments: true } } },
        });
        if (!partner)
            throw new common_1.NotFoundException('Partner agency not found');
        return partner;
    }
    async findActive(id) {
        const partner = await this.findOne(id);
        if (!partner.isActive) {
            throw new common_1.BadRequestException('Partner agency is inactive');
        }
        return partner;
    }
    async create(dto) {
        const name = dto.name?.trim();
        if (!name)
            throw new common_1.BadRequestException('Partner name is required');
        const existing = await this.prisma.partnerAgency.findUnique({
            where: { name },
        });
        if (existing)
            throw new common_1.ConflictException('Partner name already exists');
        const partner = await this.prisma.partnerAgency.create({
            data: {
                name,
                contactName: dto.contactName?.trim() || null,
                phone: dto.phone?.trim() || null,
                email: dto.email?.trim() || null,
                address: dto.address?.trim() || null,
                note: dto.note?.trim() || null,
                isActive: dto.isActive ?? true,
            },
        });
        await this.audit.log({
            entityType: 'PartnerAgency',
            entityId: partner.id,
            action: 'CREATE',
            afterData: partner,
        });
        return partner;
    }
    async update(id, dto) {
        const before = await this.findOne(id);
        const name = dto.name?.trim();
        if (dto.name !== undefined && !name) {
            throw new common_1.BadRequestException('Partner name is required');
        }
        if (name && name !== before.name) {
            const dup = await this.prisma.partnerAgency.findFirst({
                where: { name, id: { not: id } },
            });
            if (dup)
                throw new common_1.ConflictException('Partner name already exists');
        }
        const partner = await this.prisma.partnerAgency.update({
            where: { id },
            data: {
                ...(name ? { name } : {}),
                ...(dto.contactName !== undefined
                    ? { contactName: dto.contactName?.trim() || null }
                    : {}),
                ...(dto.phone !== undefined
                    ? { phone: dto.phone?.trim() || null }
                    : {}),
                ...(dto.email !== undefined
                    ? { email: dto.email?.trim() || null }
                    : {}),
                ...(dto.address !== undefined
                    ? { address: dto.address?.trim() || null }
                    : {}),
                ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            },
        });
        await this.audit.log({
            entityType: 'PartnerAgency',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: partner,
        });
        return partner;
    }
    async remove(id) {
        const before = await this.findOne(id);
        if (before._count.assignments > 0 || before._count.partnerPayments > 0) {
            const partner = await this.prisma.partnerAgency.update({
                where: { id },
                data: { isActive: false },
            });
            await this.audit.log({
                entityType: 'PartnerAgency',
                entityId: id,
                action: 'DEACTIVATE',
                beforeData: before,
                afterData: partner,
            });
            return { message: 'Partner deactivated (it is used by trips or payments)' };
        }
        await this.prisma.partnerAgency.delete({ where: { id } });
        await this.audit.log({
            entityType: 'PartnerAgency',
            entityId: id,
            action: 'DELETE',
            beforeData: before,
        });
        return { message: 'Partner deleted' };
    }
};
exports.PartnersService = PartnersService;
exports.PartnersService = PartnersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], PartnersService);
//# sourceMappingURL=partners.service.js.map