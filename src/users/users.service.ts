import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
  UpdateUserRoleDto,
} from './dto/user.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { RoleType } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { UpdateUserPasswordDto } from './dto/user-password.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private userSelect = {
    id: true,
    email: true,
    name: true,
    avatarUrl: true,
    role: true,
    userType: true,
    isActive: true,
    storageQuotaMb: true,
    authProvider: true,
    lastLogin: true,
    createdAt: true,
    updatedAt: true,
    roles: { include: { role: true } },
    permissions: { include: { permission: true } },
  };

  async findAll(query: QueryUserDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const { page, limit, q, role, userType, isActive } = query;
    const where: any = {};
    if (actor.role !== RoleType.ADMIN) {
      where.id = actor.id;
    }
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }
    if (userType) {
      where.userType = userType;
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
    const usedMap = new Map<string, number>();
    const usedAgg = await this.prisma.driveFile.groupBy({
      by: ['userId'],
      _sum: { size: true },
    });
    for (const row of usedAgg) {
      if (row.userId) usedMap.set(row.userId, row._sum.size ?? 0);
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

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    const role = dto.role ?? RoleType.OFFICE;
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        passwordHash,
        role,
        userType: dto.userType,
        roles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
        permissions: dto.permissionIds?.length
          ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
    });
    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actor: { id: string; role: RoleType }) {
    await this.findOne(id);
    if (dto.role !== undefined) {
      const target = await this.prisma.user.findUniqueOrThrow({ where: { id } });
      if (target.id === actor.id && dto.role !== target.role) {
        throw new ForbiddenException('You cannot change your own role');
      }
      if (target.role === RoleType.ADMIN && dto.role !== RoleType.ADMIN) {
        const admins = await this.prisma.user.count({ where: { role: RoleType.ADMIN } });
        if (admins <= 1) {
          throw new ForbiddenException('Cannot demote the last ADMIN');
        }
      }
    }
    const data: any = {
      name: dto.name,
      avatarUrl: dto.avatarUrl,
      role: dto.role,
      userType: dto.userType,
      isActive: dto.isActive,
      storageQuotaMb: dto.storageQuotaMb,
    };
    if (dto.roleIds !== undefined) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      data.roles = { create: dto.roleIds.map((roleId) => ({ roleId })) };
    }
    if (dto.permissionIds !== undefined) {
      await this.prisma.userPermission.deleteMany({ where: { userId: id } });
      data.permissions = { create: dto.permissionIds.map((permissionId) => ({ permissionId })) };
    }
    await this.prisma.user.update({ where: { id }, data });
    return this.findOne(id);
  }

  async updateRoles(id: string, dto: UpdateUserRoleDto, actor: { id: string; role: RoleType }) {
    const target = await this.findOne(id);
    if (target.id === actor.id && dto.roleIds?.length && !dto.roleIds.includes(await this.getAdminRoleId())) {
      throw new ForbiddenException('You cannot remove the ADMIN role from yourself');
    }
    const isAdminTarget = target.role === RoleType.ADMIN;
    if (isAdminTarget && actor.role !== RoleType.ADMIN) {
      throw new ForbiddenException('Only ADMIN can manage an ADMIN user');
    }
    if (isAdminTarget && !dto.roleIds?.includes(await this.getAdminRoleId())) {
      throw new ForbiddenException('Cannot remove the system ADMIN role from an ADMIN user');
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

  private async getAdminRoleId(): Promise<string> {
    const adminRole = await this.prisma.role.findFirst({ where: { isSystem: true } });
    return adminRole?.id ?? '';
  }

  async updatePassword(id: string, dto: UpdateUserPasswordDto, actor: { id: string; role: RoleType }) {
    const target = await this.findOne(id);
    if (target.role === RoleType.ADMIN && actor.role !== RoleType.ADMIN) {
      throw new ForbiddenException('Only ADMIN can reset an ADMIN user password');
    }
    if (target.id !== actor.id && actor.role !== RoleType.ADMIN) {
      throw new ForbiddenException('You can only change your own password');
    }
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.password, 10) },
    });
    return { message: 'Password updated' };
  }

  async remove(id: string, actor: { id: string; role: RoleType }) {
    const target = await this.findOne(id);
    if (target.role === RoleType.ADMIN) {
      const admins = await this.prisma.user.count({ where: { role: RoleType.ADMIN } });
      if (admins <= 1) {
        throw new ForbiddenException('Cannot delete the last ADMIN');
      }
    }
    if (target.id === actor.id) {
      throw new BadRequestException('Cannot delete your own account');
    }
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }
}
