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
const client_1 = require("@prisma/client");
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
    isProvider(actor) {
        return !!actor && actor.role === client_1.RoleType.TRANSPORT_PROVIDER;
    }
    providerScope(actor) {
        return this.isProvider(actor) ? { providerId: actor.providerId } : undefined;
    }
    requireProviderId(actor) {
        if (!this.isProvider(actor) || !actor.providerId) {
            throw new common_1.ForbiddenException('Your account is not linked to a transportation provider');
        }
        return actor.providerId;
    }
    async findAll(query, actor) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const { tourId, providerId, vehicleId } = query;
        const where = this.providerScope(actor);
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
    async getDropdownData(actor) {
        const [providers, tours] = await Promise.all([
            this.prisma.transportationProvider.findMany({
                where: this.providerScope(actor),
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
    async getAssignable(actor) {
        const prices = await this.prisma.routePrice.findMany({
            where: this.providerScope(actor),
            include: {
                tour: { select: { id: true, name: true, durationDays: true } },
                vehicle: { select: { id: true, capacity: true, plateNumber: true, brand: true } },
                provider: { select: { id: true, name: true } },
            },
            orderBy: [{ provider: { name: 'asc' } }, { tour: { name: 'asc' } }],
        });
        return prices.map((p) => ({
            providerId: p.providerId,
            providerName: p.provider.name,
            vehicleId: p.vehicle.id,
            capacity: p.vehicle.capacity,
            plateNumber: p.vehicle.plateNumber,
            brand: p.vehicle.brand,
            tourId: p.tour.id,
            tourName: p.tour.name,
            durationDays: p.tour.durationDays ?? 1,
            price: Number(p.price),
        }));
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
    async create(actor, dto) {
        const providerId = this.isProvider(actor) ? this.requireProviderId(actor) : dto.providerId;
        if (this.isProvider(actor))
            await this.assertVehicleBelongsToProvider(dto.vehicleId, providerId);
        const existing = await this.prisma.routePrice.findUnique({
            where: {
                tourId_providerId_vehicleId: {
                    tourId: dto.tourId,
                    providerId,
                    vehicleId: dto.vehicleId,
                },
            },
        });
        if (existing)
            throw new common_1.ConflictException('Route price already exists for this tour, provider and vehicle');
        const routePrice = await this.prisma.routePrice.create({
            data: { ...dto, providerId },
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
    async update(actor, id, dto) {
        const before = await this.findOne(id);
        if (this.isProvider(actor)) {
            if (before.providerId !== actor.providerId) {
                throw new common_1.ForbiddenException('Cannot edit a route price of another provider');
            }
            delete dto.providerId;
        }
        const tourId = dto.tourId ?? before.tourId;
        const providerId = dto.providerId ?? before.providerId;
        const vehicleId = dto.vehicleId ?? before.vehicleId;
        if (tourId && providerId) {
            if (this.isProvider(actor))
                await this.assertVehicleBelongsToProvider(vehicleId, providerId);
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
    async assertVehicleBelongsToProvider(vehicleId, providerId) {
        if (!vehicleId || !providerId)
            return;
        const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle || vehicle.providerId !== providerId) {
            throw new common_1.ForbiddenException('Vehicle does not belong to your provider');
        }
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