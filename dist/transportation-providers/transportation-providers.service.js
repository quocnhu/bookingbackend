"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportationProvidersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
let TransportationProvidersService = class TransportationProvidersService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    personSelect = {
        id: true,
        name: true,
        email: true,
        isActive: true,
    };
    async findAll() {
        const [providers, contacts, drivers] = await Promise.all([
            this.prisma.transportationProvider.findMany({
                include: {
                    vehicles: {
                        orderBy: [{ capacity: 'asc' }, { brand: 'asc' }],
                    },
                },
                orderBy: { name: 'asc' },
            }),
            this.prisma.user.findMany({
                where: { role: client_1.RoleType.TRANSPORT_PROVIDER },
                select: { ...this.personSelect, providerId: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.user.findMany({
                where: { role: client_1.RoleType.DRIVER },
                select: { ...this.personSelect, providerId: true },
                orderBy: { name: 'asc' },
            }),
        ]);
        const contactByProvider = new Map();
        for (const c of contacts) {
            if (c.providerId && !contactByProvider.has(c.providerId))
                contactByProvider.set(c.providerId, c);
        }
        const driversByProvider = new Map();
        for (const d of drivers) {
            if (!d.providerId)
                continue;
            if (!driversByProvider.has(d.providerId))
                driversByProvider.set(d.providerId, []);
            driversByProvider.get(d.providerId).push(d);
        }
        return providers.map((p) => ({
            id: p.id,
            name: p.name,
            contact: contactByProvider.get(p.id) ?? null,
            vehicles: p.vehicles ?? [],
            drivers: driversByProvider.get(p.id) ?? [],
        }));
    }
    async findOne(id) {
        const providers = await this.findAll();
        const provider = providers.find((p) => p.id === id);
        if (!provider)
            throw new common_1.NotFoundException('Transportation provider not found');
        return provider;
    }
    async findAllDrivers() {
        return this.prisma.user.findMany({
            where: { role: client_1.RoleType.DRIVER },
            select: { ...this.personSelect, providerId: true },
            orderBy: [{ name: 'asc' }, { email: 'asc' }],
        });
    }
    async ensureProviderOrFail(providerId) {
        const provider = await this.prisma.transportationProvider.findUnique({
            where: { id: providerId },
        });
        if (!provider)
            throw new common_1.NotFoundException('Transportation provider not found');
        return provider;
    }
    async createProvider(dto) {
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const password = dto.password || 'provider123';
        const passwordHash = await bcrypt.hash(password, 10);
        const provider = await this.prisma.transportationProvider.create({
            data: { name: dto.name },
        });
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                passwordHash,
                role: client_1.RoleType.TRANSPORT_PROVIDER,
                userType: 'provider',
                providerId: provider.id,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                providerId: true,
            },
        });
        await this.auditService.log({
            entityType: 'TransportationProvider',
            entityId: provider.id,
            action: 'CREATE',
            afterData: { provider, user },
        });
        return { provider, user, defaultPassword: dto.password ? undefined : password };
    }
    async createVehicle(dto) {
        await this.ensureProviderOrFail(dto.providerId);
        const vehicle = await this.prisma.vehicle.create({
            data: {
                providerId: dto.providerId,
                plateNumber: dto.plateNumber,
                capacity: dto.capacity ?? 12,
                brand: dto.brand,
            },
        });
        await this.auditService.log({
            entityType: 'Vehicle',
            entityId: vehicle.id,
            action: 'CREATE',
            afterData: vehicle,
        });
        return vehicle;
    }
    async updateVehicle(id, dto) {
        const before = await this.prisma.vehicle.findUnique({ where: { id } });
        if (!before)
            throw new common_1.NotFoundException('Vehicle not found');
        if (dto.providerId)
            await this.ensureProviderOrFail(dto.providerId);
        const vehicle = await this.prisma.vehicle.update({
            where: { id },
            data: {
                providerId: dto.providerId,
                plateNumber: dto.plateNumber,
                capacity: dto.capacity,
                brand: dto.brand,
            },
        });
        await this.auditService.log({
            entityType: 'Vehicle',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: vehicle,
        });
        return vehicle;
    }
    async deleteVehicle(id) {
        const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found');
        const priceIds = await this.prisma.routePrice.findMany({
            where: { vehicleId: id },
            select: { id: true },
        });
        if (priceIds.length) {
            await this.prisma.routePrice.deleteMany({ where: { vehicleId: id } });
            await this.auditService.log({
                entityType: 'RoutePrice',
                entityId: id,
                action: 'DELETE_BY_VEHICLE',
                beforeData: { deleted: priceIds.length },
            });
        }
        await this.prisma.vehicle.delete({ where: { id } });
        await this.auditService.log({
            entityType: 'Vehicle',
            entityId: id,
            action: 'DELETE',
            beforeData: vehicle,
        });
        return { message: 'Vehicle deleted' };
    }
    async assignDriver(providerId, dto) {
        await this.ensureProviderOrFail(providerId);
        const driver = await this.prisma.user.findUnique({ where: { id: dto.userId } });
        if (!driver)
            throw new common_1.NotFoundException('Driver not found');
        if (driver.role !== client_1.RoleType.DRIVER) {
            throw new common_1.BadRequestException('Only users with DRIVER role can be assigned to a provider');
        }
        const before = { ...driver };
        const updated = await this.prisma.user.update({
            where: { id: dto.userId },
            data: { providerId },
            select: { id: true, name: true, email: true, role: true, providerId: true },
        });
        await this.auditService.log({
            entityType: 'DriverProvider',
            entityId: dto.userId,
            action: 'ASSIGN',
            beforeData: { providerId: before.providerId },
            afterData: { providerId },
        });
        return updated;
    }
    async unassignDriver(providerId, userId) {
        await this.ensureProviderOrFail(providerId);
        const driver = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!driver)
            throw new common_1.NotFoundException('Driver not found');
        if (driver.providerId !== providerId) {
            throw new common_1.BadRequestException('Driver is not assigned to this provider');
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { providerId: null },
            select: { id: true, name: true, email: true, role: true, providerId: true },
        });
        await this.auditService.log({
            entityType: 'DriverProvider',
            entityId: userId,
            action: 'UNASSIGN',
            beforeData: { providerId },
            afterData: { providerId: null },
        });
        return updated;
    }
};
exports.TransportationProvidersService = TransportationProvidersService;
exports.TransportationProvidersService = TransportationProvidersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], TransportationProvidersService);
//# sourceMappingURL=transportation-providers.service.js.map