import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { RoleType } from '@prisma/client';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
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

  private isProvider(actor?: AuthenticatedUser) {
    return !!actor && actor.role === RoleType.TRANSPORT_PROVIDER;
  }

  private providerScope(actor?: AuthenticatedUser): any {
    return this.isProvider(actor) ? { providerId: actor!.providerId } : undefined;
  }

  private requireProviderId(actor?: AuthenticatedUser): string {
    if (!this.isProvider(actor) || !actor!.providerId) {
      throw new ForbiddenException('Your account is not linked to a transportation provider');
    }
    return actor!.providerId;
  }

  async findAll(query: QueryRoutePriceDto, actor?: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { tourId, providerId, vehicleId } = query;
    const where: any = this.providerScope(actor);
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

  async getDropdownData(actor?: AuthenticatedUser) {
    const [providers, tours] = await Promise.all([
      this.prisma.transportationProvider.findMany({
        where: this.providerScope(actor),
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

  /** (provider × vehicle × tour) combinations that ALREADY have a price — the
   *  dropdown for the Assign Tour tab. A provider only sees their own vehicles. */
  async getAssignable(actor?: AuthenticatedUser) {
    const prices = await this.prisma.routePrice.findMany({
      where: this.providerScope(actor),
      include: {
        tour: { select: { id: true, name: true, durationDays: true } },
        vehicle: { select: { id: true, capacity: true, plateNumber: true, brand: true } },
        provider: { select: { id: true, name: true } },
      },
      orderBy: [{ provider: { name: 'asc' } }, { tour: { name: 'asc' } }],
    });
    return prices.map((p) => ({
      providerId: p.providerId,
      providerName: p.provider.name,
      vehicleId: p.vehicle.id,
      capacity: p.vehicle.capacity,
      plateNumber: p.vehicle.plateNumber,
      brand: p.vehicle.brand,
      tourId: p.tour.id,
      tourName: p.tour.name,
      durationDays: p.tour.durationDays ?? 1,
      price: Number(p.price),
    }));
  }

  async findOne(id: string) {
    const routePrice = await this.prisma.routePrice.findUnique({
      where: { id },
      include: this.routeInclude,
    });
    if (!routePrice) throw new NotFoundException('Route price not found');
    return routePrice;
  }

  async create(actor: AuthenticatedUser, dto: CreateRoutePriceDto) {
    const providerId = this.isProvider(actor) ? this.requireProviderId(actor) : dto.providerId;
    if (this.isProvider(actor)) await this.assertVehicleBelongsToProvider(dto.vehicleId, providerId);
    const existing = await this.prisma.routePrice.findUnique({
      where: {
        tourId_providerId_vehicleId: {
          tourId: dto.tourId,
          providerId,
          vehicleId: dto.vehicleId,
        },
      },
    });
    if (existing) throw new ConflictException('Route price already exists for this tour, provider and vehicle');
    const routePrice = await this.prisma.routePrice.create({
      data: { ...dto, providerId },
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

  async update(actor: AuthenticatedUser, id: string, dto: UpdateRoutePriceDto) {
    const before = await this.findOne(id);
    if (this.isProvider(actor)) {
      if (before.providerId !== actor.providerId) {
        throw new ForbiddenException('Cannot edit a route price of another provider');
      }
      delete dto.providerId; // a provider cannot move the record to another vehicle provider
    }
    const tourId = dto.tourId ?? before.tourId;
    const providerId = dto.providerId ?? before.providerId;
    const vehicleId = dto.vehicleId ?? before.vehicleId;
    if (tourId && providerId) {
      if (this.isProvider(actor)) await this.assertVehicleBelongsToProvider(vehicleId, providerId);
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

  private async assertVehicleBelongsToProvider(vehicleId: string | undefined, providerId: string | undefined) {
    if (!vehicleId || !providerId) return;
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || vehicle.providerId !== providerId) {
      throw new ForbiddenException('Vehicle does not belong to your provider');
    }
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