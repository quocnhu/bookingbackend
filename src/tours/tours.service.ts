import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import {
  CreateTourDto,
  ItineraryItemDto,
  QueryTourDto,
  UpdateItineraryDto,
  UpdateTourDto,
} from './dto/tour.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

@Injectable()
export class ToursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryTourDto): Promise<PaginatedResult<any>> {
    const { page, limit, q, type } = query;
    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (type) {
      where.type = type;
    }
    const [items, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        include: { _count: { select: { bookings: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tour.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id },
      include: {
        itineraries: { orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }] },
        prices: { include: { provider: true } },
        _count: { select: { bookings: true } },
      },
    });
    if (!tour) throw new NotFoundException('Tour not found');
    return tour;
  }

  async create(dto: CreateTourDto) {
    const existing = await this.prisma.tour.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Tour name already exists');
    let code = dto.code;
    if (code) {
      const dup = await this.prisma.tour.findUnique({ where: { code } });
      if (dup) throw new ConflictException('Tour code already exists');
    } else {
      code = await this.generateTourCode(dto.name, dto.durationDays ?? 1);
    }
    const tour = await this.prisma.tour.create({ data: { ...dto, code } });
    await this.auditService.log({
      entityType: 'Tour',
      entityId: tour.id,
      action: 'CREATE',
      afterData: tour,
    });
    return tour;
  }

  private async generateTourCode(name: string, durationDays: number): Promise<string> {
    const words = name.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
    const initials =
      (words[0]?.[0] ?? 'X').toUpperCase() + (words[1]?.[0] ?? 'X').toUpperCase();
    const base = `TOUR-${initials}${durationDays}`;
    let code = base;
    let i = 2;
    while (await this.prisma.tour.findUnique({ where: { code } })) {
      code = `${base}-${i++}`;
    }
    return code;
  }

  async update(id: string, dto: UpdateTourDto) {
    const before = await this.findOne(id);
    if (dto.code && dto.code !== before.code) {
      const dup = await this.prisma.tour.findFirst({
        where: { code: dto.code, id: { not: id } },
      });
      if (dup) throw new ConflictException('Tour code already exists');
    }
    const tour = await this.prisma.tour.update({ where: { id }, data: dto });
    await this.auditService.log({
      entityType: 'Tour',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: tour,
    });
    return tour;
  }

  async updateItinerary(id: string, dto: UpdateItineraryDto, changedBy: string) {
    const before = await this.findOne(id);
    const items: ItineraryItemDto[] = dto.items ?? [];

    await this.prisma.$transaction([
      this.prisma.tourItinerary.deleteMany({ where: { tourId: id } }),
      this.prisma.tourItinerary.createMany({
        data: items.map((item) => ({
          tourId: id,
          dayNumber: item.dayNumber,
          orderIndex: item.orderIndex,
          title: item.title,
          description: item.description ?? null,
          timeSlot: item.timeSlot ?? null,
          location: item.location ?? null,
        })),
      }),
    ]);

    const after = await this.findOne(id);
    await this.auditService.log({
      entityType: 'Tour',
      entityId: id,
      action: 'UPDATE_ITINERARY',
      beforeData: { itineraries: before.itineraries },
      afterData: { itineraries: after.itineraries },
      changedBy,
    });
    return after;
  }

  async remove(id: string, changedBy: string) {
    await this.findOne(id);
    await this.prisma.tour.delete({ where: { id } });
    await this.auditService.log({
      entityType: 'Tour',
      entityId: id,
      action: 'DELETE',
      changedBy,
    });
    return { message: 'Tour deleted' };
  }
}
