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

  async findAll(query: QueryUserDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const { page, limit, role, isActive } = query;
    const where: any = {};
    if (actor.role !== RoleType.ADMIN) {
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
    const data: any = {
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
      if (!hotel) throw new NotFoundException('Hotel not found');
      data.hotelId = dto.hotelId;
    }
    if (dto.providerId) {
      const provider = await this.prisma.transportationProvider.findUnique({
        where: { id: dto.providerId },
        select: { id: true },
      });
      if (!provider) throw new NotFoundException('Transportation provider not found');
      data.providerId = dto.providerId;
    }
    if (role === RoleType.TOUR_GUIDE && dto.guideProfile) {
      data.guideProfile = {
        create: {
          type: dto.guideProfile.type ?? undefined,
          languages: dto.guideProfile.languages ?? [],
          rating: dto.guideProfile.rating ?? 5,
        },
      };
    }
    if (role === RoleType.DRIVER && dto.driverProfile) {
      data.driverProfile = {
        create: {
          licenseNumber: dto.driverProfile.licenseNumber ?? '',
          type: dto.driverProfile.type ?? undefined,
          rating: dto.driverProfile.rating ?? 5,
        },
      };
    }

    const user = await this.prisma.user.create({ data });
    if (role === RoleType.HOTEL && dto.hotelId && dto.hotelCommissionPercent !== undefined) {
      await this.prisma.hotel.update({
        where: { id: dto.hotelId },
        data: { commissionPercent: dto.hotelCommissionPercent },
      });
    }
    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actor: { id: string; role: RoleType }) {
    const existing = await this.findOne(id);
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

    const nextRole = dto.role ?? existing.role;
    const data: any = {
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
        if (!hotel) throw new NotFoundException('Hotel not found');
      }
    }
    if (dto.providerId !== undefined) {
      data.providerId = dto.providerId || null;
      if (data.providerId) {
        const provider = await this.prisma.transportationProvider.findUnique({
          where: { id: data.providerId },
          select: { id: true },
        });
        if (!provider) throw new NotFoundException('Transportation provider not found');
      }
    }

    if (dto.guideProfile !== undefined) {
      if (dto.guideProfile === null) {
        data.guideProfile = { deleteMany: {} };
      } else if (nextRole === RoleType.TOUR_GUIDE) {
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
      } else if (nextRole === RoleType.DRIVER) {
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
    if (nextRole === RoleType.HOTEL && hotelIdForCommission && dto.hotelCommissionPercent !== undefined) {
      await this.prisma.hotel.update({
        where: { id: hotelIdForCommission },
        data: { commissionPercent: dto.hotelCommissionPercent },
      });
    }
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
