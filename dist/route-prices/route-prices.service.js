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
exports.RoutePricesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let RoutePricesService = class RoutePricesService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    routeInclude = {
        tour: true,
        provider: true,
        vehicle: true,
    };
    async findAll(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const { tourId, providerId, vehicleId } = query;
        const where = {};
        if (tourId)
            where.tourId = tourId;
        if (providerId)
            where.providerId = providerId;
        if (vehicleId)
            where.vehicleId = vehicleId;
        const all = await this.prisma.routePrice.findMany({
            where,
            include: this.routeInclude,
            orderBy: [{ provider: { name: 'asc' } }, { tour: { name: 'asc' } }],
        });
        let providerIndex = -1;
        let prevProviderId = null;
        const flat = all.map((item, i) => {
            const first = i === 0 || item.providerId !== prevProviderId;
            if (first)
                providerIndex += 1;
            prevProviderId = item.providerId;
            return {
                ...item,
                rowNo: i + 1,
                providerIndex,
                first,
            };
        });
        const total = flat.length;
        const items = flat.slice((page - 1) * limit, page * limit);
        return { items, total, page, limit };
    }
    async getDropdownData() {
        const [providers, tours] = await Promise.all([
            this.prisma.transportationProvider.findMany({
                select: {
                    id: true,
                    name: true,
                    vehicles: {
                        select: { id: true, capacity: true, plateNumber: true, brand: true },
                        orderBy: { capacity: 'asc' },
                    },
                },
                orderBy: { name: 'asc' },
            }),
            this.prisma.tour.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
        ]);
        return { providers, tours };
    }
    async findOne(id) {
        const routePrice = await this.prisma.routePrice.findUnique({
            where: { id },
            include: this.routeInclude,
        });
        if (!routePrice)
            throw new common_1.NotFoundException('Route price not found');
        return routePrice;
    }
    async create(dto) {
        const existing = await this.prisma.routePrice.findUnique({
            where: {
                tourId_providerId_vehicleId: {
                    tourId: dto.tourId,
                    providerId: dto.providerId,
                    vehicleId: dto.vehicleId,
                },
            },
        });
        if (existing)
            throw new common_1.ConflictException('Route price already exists for this tour, provider and vehicle');
        const routePrice = await this.prisma.routePrice.create({
            data: { ...dto },
            include: this.routeInclude,
        });
        await this.auditService.log({
            entityType: 'RoutePrice',
            entityId: routePrice.id,
            action: 'CREATE',
            afterData: routePrice,
        });
        return routePrice;
    }
    async update(id, dto) {
        const before = await this.findOne(id);
        const tourId = dto.tourId ?? before.tourId;
        const providerId = dto.providerId ?? before.providerId;
        const vehicleId = dto.vehicleId ?? before.vehicleId;
        if (tourId && providerId) {
            const dup = await this.prisma.routePrice.findFirst({
                where: {
                    tourId,
                    providerId,
                    vehicleId,
                    id: { not: id },
                },
            });
            if (dup)
                throw new common_1.ConflictException('Route price already exists for this tour, provider and vehicle');
        }
        const routePrice = await this.prisma.routePrice.update({
            where: { id },
            data: { ...dto },
            include: this.routeInclude,
        });
        await this.auditService.log({
            entityType: 'RoutePrice',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: routePrice,
        });
        return routePrice;
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.routePrice.delete({ where: { id } });
        await this.auditService.log({
            entityType: 'RoutePrice',
            entityId: id,
            action: 'DELETE',
        });
        return { message: 'Route price deleted' };
    }
};
exports.RoutePricesService = RoutePricesService;
exports.RoutePricesService = RoutePricesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], RoutePricesService);
//# sourceMappingURL=route-prices.service.js.map