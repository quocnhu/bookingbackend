import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { CreateRoutePriceDto, QueryRoutePriceDto, UpdateRoutePriceDto } from './dto/route-price.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

@Injectable()
export class RoutePricesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private routeInclude = {
    tour: true,
    provider: true,
    vehicle: true,
  };

  async findAll(query: QueryRoutePriceDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { tourId, providerId, vehicleId } = query;
    const where: any = {};
    if (tourId) where.tourId = tourId;
    if (providerId) where.providerId = providerId;
    if (vehicleId) where.vehicleId = vehicleId;
    const all = await this.prisma.routePrice.findMany({
      where,
      include: this.routeInclude,
      orderBy: [{ provider: { name: 'asc' } }, { tour: { name: 'asc' } }],
    });
    let providerIndex = -1;
    let prevProviderId: string | null = null;
    const flat = all.map((item, i) => {
      const first = i === 0 || item.providerId !== prevProviderId;
      if (first) providerIndex += 1;
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

  async getDropdownData() {
    const [providers, tours] = await Promise.all([
      this.prisma.transportationProvider.findMany({
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

  async findOne(id: string) {
    const routePrice = await this.prisma.routePrice.findUnique({
      where: { id },
      include: this.routeInclude,
    });
    if (!routePrice) throw new NotFoundException('Route price not found');
    return routePrice;
  }

  async create(dto: CreateRoutePriceDto) {
    const existing = await this.prisma.routePrice.findUnique({
      where: {
        tourId_providerId_vehicleId: {
          tourId: dto.tourId,
          providerId: dto.providerId,
          vehicleId: dto.vehicleId,
        },
      },
    });
    if (existing) throw new ConflictException('Route price already exists for this tour, provider and vehicle');
    const routePrice = await this.prisma.routePrice.create({
      data: { ...dto },
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

  async update(id: string, dto: UpdateRoutePriceDto) {
    const before = await this.findOne(id);
    const tourId = dto.tourId ?? before.tourId;
    const providerId = dto.providerId ?? before.providerId;
    const vehicleId = dto.vehicleId ?? before.vehicleId;
    if (tourId && providerId) {
      const dup = await this.prisma.routePrice.findFirst({
        where: {
          tourId,
          providerId,
          vehicleId,
          id: { not: id },
        },
      });
      if (dup) throw new ConflictException('Route price already exists for this tour, provider and vehicle');
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

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.routePrice.delete({ where: { id } });
    await this.auditService.log({
      entityType: 'RoutePrice',
      entityId: id,
      action: 'DELETE',
    });
    return { message: 'Route price deleted' };
  }
}
