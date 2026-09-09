import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePermissionDto, QueryPermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPermissionDto): Promise<PaginatedResult<any>> {
    const { page, limit } = query;
    const where = {};
    const [items, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        orderBy: { group: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.permission.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findAllFlat() {
    return this.prisma.permission.findMany({ orderBy: { group: 'asc' } });
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async create(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Permission code already exists');
    return this.prisma.permission.create({ data: dto });
  }

  async update(id: string, dto: UpdatePermissionDto) {
    await this.findOne(id);
    return this.prisma.permission.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.permission.delete({ where: { id } });
    return { message: 'Permission deleted' };
  }
}
