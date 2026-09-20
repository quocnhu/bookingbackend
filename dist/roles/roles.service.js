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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("@/prisma/prisma.service");
let RolesService = class RolesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page, limit } = query;
        const where = {};
        const [items, total] = await Promise.all([
            this.prisma.role.findMany({
                where,
                include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
                orderBy: { createdAt: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.role.count({ where }),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                permissions: { include: { permission: true } },
                users: { include: { user: true } },
            },
        });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        return role;
    }
    async create(dto) {
        const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
        if (existing)
            throw new common_1.ConflictException('Role already exists');
        return this.prisma.role.create({
            data: {
                name: dto.name,
                description: dto.description,
                permissions: dto.permissionIds?.length
                    ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
                    : undefined,
            },
        });
    }
    async update(id, dto) {
        const role = await this.findOne(id);
        if (role.isSystem) {
            if (dto.permissionIds !== undefined) {
                throw new common_1.ForbiddenException('Cannot modify permissions of a system role');
            }
        }
        if (dto.name !== undefined) {
            const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
            if (existing && existing.id !== id)
                throw new common_1.ConflictException('Role name already exists');
        }
        const data = { name: dto.name, description: dto.description };
        if (dto.permissionIds !== undefined) {
            await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
            data.permissions = { create: dto.permissionIds.map((permissionId) => ({ permissionId })) };
        }
        await this.prisma.role.update({ where: { id }, data });
        return this.findOne(id);
    }
    async remove(id) {
        const role = await this.findOne(id);
        if (role.isSystem) {
            throw new common_1.ForbiddenException('Cannot delete a system role');
        }
        await this.prisma.role.delete({ where: { id } });
        return { message: 'Role deleted' };
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map