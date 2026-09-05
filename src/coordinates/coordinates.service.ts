import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { CreateCoordinateDto, QueryCoordinateDto, UpdateCoordinateDto } from './dto/coordinate.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

@Injectable()
export class CoordinatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryCoordinateDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { q } = query;
    const where: any = {};
    if (q) {
      where.OR = [
        { hotelName: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.coordinate.findMany({
        where,
        orderBy: { hotelName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.coordinate.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const coordinate = await this.prisma.coordinate.findUnique({ where: { id } });
    if (!coordinate) throw new NotFoundException('Coordinate not found');
    return coordinate;
  }

  async create(dto: CreateCoordinateDto) {
    const existing = await this.prisma.coordinate.findUnique({
      where: { address: dto.address },
    });
    if (existing) throw new ConflictException('Address already exists');
    const coordinate = await this.prisma.coordinate.create({ data: dto });
    await this.auditService.log({
      entityType: 'Coordinate',
      entityId: coordinate.id,
      action: 'CREATE',
      afterData: coordinate,
    });
    return coordinate;
  }

  async update(id: string, dto: UpdateCoordinateDto) {
    const before = await this.findOne(id);
    if (dto.address && dto.address !== before.address) {
      const dup = await this.prisma.coordinate.findFirst({
        where: { address: dto.address, id: { not: id } },
      });
      if (dup) throw new ConflictException('Address already exists');
    }
    const coordinate = await this.prisma.coordinate.update({ where: { id }, data: dto });
    await this.auditService.log({
      entityType: 'Coordinate',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: coordinate,
    });
    return coordinate;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.coordinate.delete({ where: { id } });
    await this.auditService.log({
      entityType: 'Coordinate',
      entityId: id,
      action: 'DELETE',
    });
    return { message: 'Coordinate deleted' };
  }
}
