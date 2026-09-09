import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { RoleType } from '@prisma/client';
import {
  AssignDriverToProviderDto,
  CreateTransportationVehicleDto,
  UpdateTransportationVehicleDto,
} from './dto/transportation-provider.dto';

@Injectable()
export class TransportationProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private personSelect = {
    id: true,
    name: true,
    email: true,
    isActive: true,
  };

  /** Mọi user đã đăng nhập đều đọc được (OFFICE/ADMIN xem quan hệ provider ↔ xe ↔ tài xế). */
  async findAll() {
    const [providers, contacts, drivers] = await Promise.all([
      this.prisma.transportationProvider.findMany({
        include: {
          vehicles: {
            orderBy: [{ capacity: 'asc' }, { brand: 'asc' }],
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: RoleType.TRANSPORT_PROVIDER },
        select: { ...this.personSelect, providerId: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: RoleType.DRIVER },
        select: { ...this.personSelect, providerId: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const contactByProvider = new Map<string, any>();
    for (const c of contacts) {
      if (c.providerId && !contactByProvider.has(c.providerId)) contactByProvider.set(c.providerId, c);
    }
    const driversByProvider = new Map<string, any[]>();
    for (const d of drivers) {
      if (!d.providerId) continue;
      if (!driversByProvider.has(d.providerId)) driversByProvider.set(d.providerId, []);
      driversByProvider.get(d.providerId)!.push(d);
    }

    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      contact: contactByProvider.get(p.id) ?? null,
      vehicles: p.vehicles ?? [],
      drivers: driversByProvider.get(p.id) ?? [],
    }));
  }

  async findOne(id: string) {
    const providers = await this.findAll();
    const provider = providers.find((p) => p.id === id);
    if (!provider) throw new NotFoundException('Transportation provider not found');
    return provider;
  }

  /** Mọi user role DRIVER kèm providerId — cho dropdown gán tài xế vào provider. */
  async findAllDrivers() {
    return this.prisma.user.findMany({
      where: { role: RoleType.DRIVER },
      select: { ...this.personSelect, providerId: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
  }

  private async ensureProviderOrFail(providerId: string) {
    const provider = await this.prisma.transportationProvider.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Transportation provider not found');
    return provider;
  }

  async createVehicle(dto: CreateTransportationVehicleDto) {
    await this.ensureProviderOrFail(dto.providerId);
    const vehicle = await this.prisma.vehicle.create({
      data: {
        providerId: dto.providerId,
        plateNumber: dto.plateNumber,
        capacity: dto.capacity ?? 12,
        brand: dto.brand,
      },
    });
    await this.auditService.log({
      entityType: 'Vehicle',
      entityId: vehicle.id,
      action: 'CREATE',
      afterData: vehicle,
    });
    return vehicle;
  }

  async updateVehicle(id: string, dto: UpdateTransportationVehicleDto) {
    const before = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Vehicle not found');
    if (dto.providerId) await this.ensureProviderOrFail(dto.providerId);
    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        providerId: dto.providerId,
        plateNumber: dto.plateNumber,
        capacity: dto.capacity,
        brand: dto.brand,
      },
    });
    await this.auditService.log({
      entityType: 'Vehicle',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: vehicle,
    });
    return vehicle;
  }

  async deleteVehicle(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    // RoutePrice.vehicleId là FK Restrict → phải xoá các route price của xe trước.
    const priceIds = await this.prisma.routePrice.findMany({
      where: { vehicleId: id },
      select: { id: true },
    });
    if (priceIds.length) {
      await this.prisma.routePrice.deleteMany({ where: { vehicleId: id } });
      await this.auditService.log({
        entityType: 'RoutePrice',
        entityId: id,
        action: 'DELETE_BY_VEHICLE',
        beforeData: { deleted: priceIds.length },
      });
    }

    await this.prisma.vehicle.delete({ where: { id } });
    await this.auditService.log({
      entityType: 'Vehicle',
      entityId: id,
      action: 'DELETE',
      beforeData: vehicle,
    });
    return { message: 'Vehicle deleted' };
  }

  async assignDriver(providerId: string, dto: AssignDriverToProviderDto) {
    await this.ensureProviderOrFail(providerId);
    const driver = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.role !== RoleType.DRIVER) {
      throw new BadRequestException('Only users with DRIVER role can be assigned to a provider');
    }
    const before = { ...driver };
    const updated = await this.prisma.user.update({
      where: { id: dto.userId },
      data: { providerId },
      select: { id: true, name: true, email: true, role: true, providerId: true },
    });
    await this.auditService.log({
      entityType: 'DriverProvider',
      entityId: dto.userId,
      action: 'ASSIGN',
      beforeData: { providerId: before.providerId },
      afterData: { providerId },
    });
    return updated;
  }

  async unassignDriver(providerId: string, userId: string) {
    await this.ensureProviderOrFail(providerId);
    const driver = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.providerId !== providerId) {
      throw new BadRequestException('Driver is not assigned to this provider');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { providerId: null },
      select: { id: true, name: true, email: true, role: true, providerId: true },
    });
    await this.auditService.log({
      entityType: 'DriverProvider',
      entityId: userId,
      action: 'UNASSIGN',
      beforeData: { providerId },
      afterData: { providerId: null },
    });
    return updated;
  }
}