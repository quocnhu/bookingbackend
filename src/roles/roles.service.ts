import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from './dto/role.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryRoleDto): Promise<PaginatedResult<any>> {
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

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        users: { include: { user: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Role already exists');
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

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      // Role system (ADMIN) không sửa permission.
      if (dto.permissionIds !== undefined) {
        throw new ForbiddenException('Cannot modify permissions of a system role');
      }
    }
    if (dto.name !== undefined) {
      const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
      if (existing && existing.id !== id) throw new ConflictException('Role name already exists');
    }
    const data: any = { name: dto.name, description: dto.description };
    if (dto.permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      data.permissions = { create: dto.permissionIds.map((permissionId) => ({ permissionId })) };
    }
    await this.prisma.role.update({ where: { id }, data });
    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete a system role');
    }
    await this.prisma.role.delete({ where: { id } });
    return { message: 'Role deleted' };
  }
}
