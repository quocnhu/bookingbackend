import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { RoleType } from '@prisma/client';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import {
  AssignDriverToProviderDto,
  CreateDriverDto,
  CreateTransportationVehicleDto,
  UpdateDriverDto,
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

  private driverSelect = {
    ...this.personSelect,
    providerId: true,
    driverProfile: { select: { licenseNumber: true } },
  };

  private toDriverView(d: any) {
    return {
      id: d.id,
      name: d.name,
      email: d.email,
      isActive: d.isActive,
      providerId: d.providerId ?? null,
      licenseNumber: d.driverProfile?.licenseNumber ?? null,
    };
  }

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

  /** OFFICE/ADMIN xem toàn bộ; TRANSPORT_PROVIDER chỉ xem nhà xe của chính mình. */
  async findAll(actor?: AuthenticatedUser) {
    const [providers, contacts, drivers] = await Promise.all([
      this.prisma.transportationProvider.findMany({
        where: this.providerScope(actor),
        include: {
          vehicles: {
            orderBy: [{ capacity: 'asc' }, { brand: 'asc' }],
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: RoleType.TRANSPORT_PROVIDER, ...this.providerScope(actor) },
        select: { ...this.personSelect, providerId: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: RoleType.DRIVER, ...this.providerScope(actor) },
        select: this.driverSelect,
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
      driversByProvider.get(d.providerId)!.push(this.toDriverView(d));
    }

    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      contact: contactByProvider.get(p.id) ?? null,
      vehicles: p.vehicles ?? [],
      drivers: driversByProvider.get(p.id) ?? [],
    }));
  }

  async findOne(id: string, actor?: AuthenticatedUser) {
    const providers = await this.findAll(actor);
    const provider = providers.find((p) => p.id === id);
    if (!provider) throw new NotFoundException('Transportation provider not found');
    return provider;
  }

  /** Tài xế (kèm licenseNumber). Provider chỉ thấy tài xế thuộc nhà xe mình. */
  async findAllDrivers(actor?: AuthenticatedUser) {
    const rows = await this.prisma.user.findMany({
      where: { role: RoleType.DRIVER, ...this.providerScope(actor) },
      select: this.driverSelect,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
    return rows.map((d) => this.toDriverView(d));
  }

  /** Tạo tài xế. Provider: providerId LUÔN lấy từ session, không tin payload. */
  async createDriver(actor: AuthenticatedUser, dto: CreateDriverDto) {
    const providerId = this.isProvider(actor) ? this.requireProviderId(actor) : (dto.providerId ?? null);
    if (providerId) await this.ensureProviderOrFail(providerId);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    // Temp password cho lần đăng nhập đầu (flow gửi email/welcome sẽ bổ sung sau).
    const passwordHash = await bcrypt.hash('driver123', 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: RoleType.DRIVER,
        userType: 'crew',
        providerId,
        isActive: true,
        driverProfile: { create: { licenseNumber: dto.licenseNumber } },
      },
      select: this.driverSelect,
    });
    await this.auditService.log({
      entityType: 'Driver',
      entityId: user.id,
      action: 'CREATE',
      beforeData: { providerId: null },
      afterData: { providerId, licenseNumber: dto.licenseNumber },
    });
    return { ...this.toDriverView(user), defaultPassword: 'driver123' };
  }

  /** Sửa tài xế. Provider chỉ sửa được tài xế thuộc nhà xe mình. */
  async updateDriver(actor: AuthenticatedUser, id: string, dto: UpdateDriverDto) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { driverProfile: true } });
    if (!user || user.role !== RoleType.DRIVER) throw new NotFoundException('Driver not found');
    if (this.isProvider(actor) && user.providerId !== actor.providerId) {
      throw new ForbiddenException('Cannot edit a driver that belongs to another provider');
    }
    if (dto.email && dto.email !== user.email) {
      const dup = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (dup) throw new ConflictException('Email already registered');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        isActive: dto.isActive,
      },
      select: this.driverSelect,
    });
    if (dto.licenseNumber !== undefined) {
      await this.prisma.driverProfile.upsert({
        where: { userId: id },
        update: { licenseNumber: dto.licenseNumber },
        create: { userId: id, licenseNumber: dto.licenseNumber },
      });
    }
    await this.auditService.log({
      entityType: 'Driver',
      entityId: id,
      action: 'UPDATE',
      beforeData: { name: user.name, email: user.email },
      afterData: dto,
    });
    return this.toDriverView(updated);
  }

  private async ensureProviderOrFail(providerId: string) {
    const provider = await this.prisma.transportationProvider.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Transportation provider not found');
    return provider;
  }

  async createVehicle(actor: AuthenticatedUser, dto: CreateTransportationVehicleDto) {
    const providerId = this.isProvider(actor) ? this.requireProviderId(actor) : dto.providerId;
    await this.ensureProviderOrFail(providerId);
    const vehicle = await this.prisma.vehicle.create({
      data: {
        providerId,
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

  async updateVehicle(actor: AuthenticatedUser, id: string, dto: UpdateTransportationVehicleDto) {
    const before = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Vehicle not found');
    if (this.isProvider(actor)) {
      if (before.providerId !== actor.providerId) {
        throw new ForbiddenException('Cannot edit a vehicle that belongs to another provider');
      }
      dto.providerId = actor.providerId;
    }
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

  async deleteVehicle(actor: AuthenticatedUser, id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (this.isProvider(actor) && vehicle.providerId !== actor.providerId) {
      throw new ForbiddenException('Cannot delete a vehicle that belongs to another provider');
    }

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