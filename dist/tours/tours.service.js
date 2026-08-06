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
exports.ToursService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ToursService = class ToursService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async findAll(query) {
        const { page, limit, q, type } = query;
        const where = {};
        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (type) {
            where.type = type;
        }
        const [items, total] = await Promise.all([
            this.prisma.tour.findMany({
                where,
                include: { _count: { select: { bookings: true } } },
                orderBy: { name: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.tour.count({ where }),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id) {
        const tour = await this.prisma.tour.findUnique({
            where: { id },
            include: {
                itineraries: { orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }] },
                prices: { include: { provider: true } },
                _count: { select: { bookings: true } },
            },
        });
        if (!tour)
            throw new common_1.NotFoundException('Tour not found');
        return tour;
    }
    async create(dto) {
        const existing = await this.prisma.tour.findUnique({ where: { name: dto.name } });
        if (existing)
            throw new common_1.ConflictException('Tour name already exists');
        let code = dto.code;
        if (code) {
            const dup = await this.prisma.tour.findUnique({ where: { code } });
            if (dup)
                throw new common_1.ConflictException('Tour code already exists');
        }
        else {
            code = await this.generateTourCode(dto.name, dto.durationDays ?? 1);
        }
        const tour = await this.prisma.tour.create({ data: { ...dto, code } });
        await this.auditService.log({
            entityType: 'Tour',
            entityId: tour.id,
            action: 'CREATE',
            afterData: tour,
        });
        return tour;
    }
    async generateTourCode(name, durationDays) {
        const words = name.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
        const initials = (words[0]?.[0] ?? 'X').toUpperCase() + (words[1]?.[0] ?? 'X').toUpperCase();
        const base = `TOUR-${initials}${durationDays}`;
        let code = base;
        let i = 2;
        while (await this.prisma.tour.findUnique({ where: { code } })) {
            code = `${base}-${i++}`;
        }
        return code;
    }
    async update(id, dto) {
        const before = await this.findOne(id);
        if (dto.code && dto.code !== before.code) {
            const dup = await this.prisma.tour.findFirst({
                where: { code: dto.code, id: { not: id } },
            });
            if (dup)
                throw new common_1.ConflictException('Tour code already exists');
        }
        const tour = await this.prisma.tour.update({ where: { id }, data: dto });
        await this.auditService.log({
            entityType: 'Tour',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: tour,
        });
        return tour;
    }
    async updateItinerary(id, dto, changedBy) {
        const before = await this.findOne(id);
        const items = dto.items ?? [];
        await this.prisma.$transaction([
            this.prisma.tourItinerary.deleteMany({ where: { tourId: id } }),
            this.prisma.tourItinerary.createMany({
                data: items.map((item) => ({
                    tourId: id,
                    dayNumber: item.dayNumber,
                    orderIndex: item.orderIndex,
                    title: item.title,
                    description: item.description ?? null,
                    timeSlot: item.timeSlot ?? null,
                    location: item.location ?? null,
                })),
            }),
        ]);
        const after = await this.findOne(id);
        await this.auditService.log({
            entityType: 'Tour',
            entityId: id,
            action: 'UPDATE_ITINERARY',
            beforeData: { itineraries: before.itineraries },
            afterData: { itineraries: after.itineraries },
            changedBy,
        });
        return after;
    }
    async remove(id, changedBy) {
        await this.findOne(id);
        await this.prisma.tour.delete({ where: { id } });
        await this.auditService.log({
            entityType: 'Tour',
            entityId: id,
            action: 'DELETE',
            changedBy,
        });
        return { message: 'Tour deleted' };
    }
};
exports.ToursService = ToursService;
exports.ToursService = ToursService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ToursService);
//# sourceMappingURL=tours.service.js.map