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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    userSelect = {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        storageQuotaMb: true,
        authProvider: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        hotelId: true,
        providerId: true,
        hotel: {
            select: {
                id: true,
                name: true,
                contactName: true,
                phone: true,
                email: true,
                address: true,
                commissionPercent: true,
                isActive: true,
            },
        },
        provider: {
            select: {
                id: true,
                name: true,
                isCompany: true,
                assignmentMode: true,
            },
        },
        guideProfile: {
            select: {
                id: true,
                type: true,
                languages: true,
                rating: true,
            },
        },
        driverProfile: {
            select: {
                id: true,
                licenseNumber: true,
                type: true,
                rating: true,
            },
        },
        roles: { include: { role: true } },
        permissions: { include: { permission: true } },
    };
    async findAll(query, actor) {
        const { page, limit, role, isActive } = query;
        const where = {};
        if (actor.role !== client_1.RoleType.ADMIN) {
            where.id = actor.id;
        }
        if (role) {
            where.role = role;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: this.userSelect,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);
        const usedMap = new Map();
        const usedAgg = await this.prisma.driveFile.groupBy({
            by: ['userId'],
            _sum: { size: true },
        });
        for (const row of usedAgg) {
            if (row.userId)
                usedMap.set(row.userId, row._sum.size ?? 0);
        }
        return {
            items: items.map((u) => ({
                ...u,
                storageUsedBytes: usedMap.get(u.id) ?? 0,
            })),
            total,
            page,
            limit,
        };
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: this.userSelect,
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async create(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
        const role = dto.role ?? client_1.RoleType.OFFICE;
        const data = {
            email: dto.email,
            name: dto.name,
            avatarUrl: dto.avatarUrl,
            passwordHash,
            role,
            roles: dto.roleIds?.length
                ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
                : undefined,
            permissions: dto.permissionIds?.length
                ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
                : undefined,
        };
        if (dto.hotelId) {
            const hotel = await this.prisma.hotel.findUnique({ where: { id: dto.hotelId }, select: { id: true } });
            if (!hotel)
                throw new common_1.NotFoundException('Hotel not found');
            data.hotelId = dto.hotelId;
        }
        if (dto.providerId) {
            const provider = await this.prisma.transportationProvider.findUnique({
                where: { id: dto.providerId },
                select: { id: true },
            });
            if (!provider)
                throw new common_1.NotFoundException('Transportation provider not found');
            data.providerId = dto.providerId;
        }
        if (role === client_1.RoleType.TOUR_GUIDE && dto.guideProfile) {
            data.guideProfile = {
                create: {
                    type: dto.guideProfile.type ?? undefined,
                    languages: dto.guideProfile.languages ?? [],
                    rating: dto.guideProfile.rating ?? 5,
                },
            };
        }
        if (role === client_1.RoleType.DRIVER && dto.driverProfile) {
            data.driverProfile = {
                create: {
                    licenseNumber: dto.driverProfile.licenseNumber ?? '',
                    type: dto.driverProfile.type ?? undefined,
                    rating: dto.driverProfile.rating ?? 5,
                },
            };
        }
        const user = await this.prisma.user.create({ data });
        if (role === client_1.RoleType.HOTEL && dto.hotelId && dto.hotelCommissionPercent !== undefined) {
            await this.prisma.hotel.update({
                where: { id: dto.hotelId },
                data: { commissionPercent: dto.hotelCommissionPercent },
            });
        }
        return this.findOne(user.id);
    }
    async update(id, dto, actor) {
        const existing = await this.findOne(id);
        if (dto.role !== undefined) {
            const target = await this.prisma.user.findUniqueOrThrow({ where: { id } });
            if (target.id === actor.id && dto.role !== target.role) {
                throw new common_1.ForbiddenException('You cannot change your own role');
            }
            if (target.role === client_1.RoleType.ADMIN && dto.role !== client_1.RoleType.ADMIN) {
                const admins = await this.prisma.user.count({ where: { role: client_1.RoleType.ADMIN } });
                if (admins <= 1) {
                    throw new common_1.ForbiddenException('Cannot demote the last ADMIN');
                }
            }
        }
        const nextRole = dto.role ?? existing.role;
        const data = {
            name: dto.name,
            avatarUrl: dto.avatarUrl,
            role: dto.role,
            isActive: dto.isActive,
            storageQuotaMb: dto.storageQuotaMb,
        };
        if (dto.hotelId !== undefined) {
            data.hotelId = dto.hotelId || null;
            if (data.hotelId) {
                const hotel = await this.prisma.hotel.findUnique({ where: { id: data.hotelId }, select: { id: true } });
                if (!hotel)
                    throw new common_1.NotFoundException('Hotel not found');
            }
        }
        if (dto.providerId !== undefined) {
            data.providerId = dto.providerId || null;
            if (data.providerId) {
                const provider = await this.prisma.transportationProvider.findUnique({
                    where: { id: data.providerId },
                    select: { id: true },
                });
                if (!provider)
                    throw new common_1.NotFoundException('Transportation provider not found');
            }
        }
        if (dto.guideProfile !== undefined) {
            if (dto.guideProfile === null) {
                data.guideProfile = { deleteMany: {} };
            }
            else if (nextRole === client_1.RoleType.TOUR_GUIDE) {
                data.guideProfile = {
                    upsert: {
                        create: {
                            type: dto.guideProfile.type ?? undefined,
                            languages: dto.guideProfile.languages ?? [],
                            rating: dto.guideProfile.rating ?? 5,
                        },
                        update: {
                            ...(dto.guideProfile.type !== undefined ? { type: dto.guideProfile.type } : {}),
                            ...(dto.guideProfile.languages !== undefined ? { languages: dto.guideProfile.languages } : {}),
                            ...(dto.guideProfile.rating !== undefined ? { rating: dto.guideProfile.rating } : {}),
                        },
                    },
                };
            }
        }
        if (dto.driverProfile !== undefined) {
            if (dto.driverProfile === null) {
                data.driverProfile = { deleteMany: {} };
            }
            else if (nextRole === client_1.RoleType.DRIVER) {
                const licenseNumber = dto.driverProfile.licenseNumber?.trim();
                const currentLicense = existing.driverProfile?.licenseNumber;
                data.driverProfile = {
                    upsert: {
                        create: {
                            licenseNumber: licenseNumber || currentLicense || `DRV-${id.slice(0, 8).toUpperCase()}`,
                            type: dto.driverProfile.type ?? undefined,
                            rating: dto.driverProfile.rating ?? 5,
                        },
                        update: {
                            ...(licenseNumber ? { licenseNumber } : {}),
                            ...(dto.driverProfile.type !== undefined ? { type: dto.driverProfile.type } : {}),
                            ...(dto.driverProfile.rating !== undefined ? { rating: dto.driverProfile.rating } : {}),
                        },
                    },
                };
            }
        }
        if (dto.roleIds !== undefined) {
            await this.prisma.userRole.deleteMany({ where: { userId: id } });
            data.roles = { create: dto.roleIds.map((roleId) => ({ roleId })) };
        }
        if (dto.permissionIds !== undefined) {
            await this.prisma.userPermission.deleteMany({ where: { userId: id } });
            data.permissions = { create: dto.permissionIds.map((permissionId) => ({ permissionId })) };
        }
        await this.prisma.user.update({ where: { id }, data });
        const hotelIdForCommission = dto.hotelId !== undefined ? (dto.hotelId || null) : existing.hotelId;
        if (nextRole === client_1.RoleType.HOTEL && hotelIdForCommission && dto.hotelCommissionPercent !== undefined) {
            await this.prisma.hotel.update({
                where: { id: hotelIdForCommission },
                data: { commissionPercent: dto.hotelCommissionPercent },
            });
        }
        return this.findOne(id);
    }
    async updateRoles(id, dto, actor) {
        const target = await this.findOne(id);
        if (target.id === actor.id && dto.roleIds?.length && !dto.roleIds.includes(await this.getAdminRoleId())) {
            throw new common_1.ForbiddenException('You cannot remove the ADMIN role from yourself');
        }
        const isAdminTarget = target.role === client_1.RoleType.ADMIN;
        if (isAdminTarget && actor.role !== client_1.RoleType.ADMIN) {
            throw new common_1.ForbiddenException('Only ADMIN can manage an ADMIN user');
        }
        if (isAdminTarget && !dto.roleIds?.includes(await this.getAdminRoleId())) {
            throw new common_1.ForbiddenException('Cannot remove the system ADMIN role from an ADMIN user');
        }
        await this.prisma.userRole.deleteMany({ where: { userId: id } });
        await this.prisma.userPermission.deleteMany({ where: { userId: id } });
        await this.prisma.user.update({
            where: { id },
            data: {
                roles: dto.roleIds?.length ? { create: dto.roleIds.map((roleId) => ({ roleId })) } : undefined,
                permissions: dto.permissionIds?.length
                    ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
                    : undefined,
            },
        });
        return this.findOne(id);
    }
    async getAdminRoleId() {
        const adminRole = await this.prisma.role.findFirst({ where: { isSystem: true } });
        return adminRole?.id ?? '';
    }
    async updatePassword(id, dto, actor) {
        const target = await this.findOne(id);
        if (target.role === client_1.RoleType.ADMIN && actor.role !== client_1.RoleType.ADMIN) {
            throw new common_1.ForbiddenException('Only ADMIN can reset an ADMIN user password');
        }
        if (target.id !== actor.id && actor.role !== client_1.RoleType.ADMIN) {
            throw new common_1.ForbiddenException('You can only change your own password');
        }
        await this.prisma.user.update({
            where: { id },
            data: { passwordHash: await bcrypt.hash(dto.password, 10) },
        });
        return { message: 'Password updated' };
    }
    async remove(id, actor) {
        const target = await this.findOne(id);
        if (target.role === client_1.RoleType.ADMIN) {
            const admins = await this.prisma.user.count({ where: { role: client_1.RoleType.ADMIN } });
            if (admins <= 1) {
                throw new common_1.ForbiddenException('Cannot delete the last ADMIN');
            }
        }
        if (target.id === actor.id) {
            throw new common_1.BadRequestException('Cannot delete your own account');
        }
        await this.prisma.user.delete({ where: { id } });
        return { message: 'User deleted' };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map