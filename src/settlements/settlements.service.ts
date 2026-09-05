import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { CreateSettlementCategoryDto, CreateSettlementDto, QuerySettlementDto, UpdateSettlementDto } from './dto/settlement.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { RoleType } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private include = {
    category: true,
    createdBy: { select: { id: true, name: true, email: true } },
    booking: { select: { id: true, bookingRef: true, customerName: true, totalPax: true, payment: true } },
    assignment: { select: { id: true, code: true, tourName: true, status: true } },
  };

  // ── Danh mục khoản thu/chi (dropdown từ Back-end) ───────────────────
  async listCategories() {
    return this.prisma.settlementCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: CreateSettlementCategoryDto) {
    const category = await this.prisma.settlementCategory.create({ data: dto });
    await this.auditService.log({
      entityType: 'SettlementCategory',
      entityId: category.id,
      action: 'CREATE',
      changedBy: undefined,
      afterData: category,
    });
    return category;
  }

  async removeCategory(id: string) {
    const count = await this.prisma.settlement.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new BadRequestException('Category is in use by some settlements');
    }
    await this.prisma.settlementCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  // ── Settlements ─────────────────────────────────────────────────────
  async findAll(query: QuerySettlementDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const { page, limit, bookingId, assignmentId, categoryId } = query;
    const where: any = {};
    if (bookingId) where.bookingId = bookingId;
    if (assignmentId) where.assignmentId = assignmentId;
    if (categoryId) where.categoryId = categoryId;
    if (actor.role !== RoleType.ADMIN) {
      // Người không phải Admin chỉ thấy được khoản mình tạo
      where.createdById = actor.id;
    }

    const [items, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.settlement.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: this.include,
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return settlement;
  }

  async create(dto: CreateSettlementDto, actor: AuthenticatedUser) {
    // Phải gắn vào ít nhất 1 trong 2 lớp: Booking (lớp 1) hoặc Assignment (lớp 2)
    if (!dto.bookingId && !dto.assignmentId) {
      throw new BadRequestException(
        'A settlement must belong to either a booking (layer 1) or an assignment (layer 2)',
      );
    }

    const settlement = await this.prisma.settlement.create({
      data: {
        amount: dto.amount,
        note: dto.note,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        customCategoryName: dto.customCategoryName,
        bookingId: dto.bookingId,
        assignmentId: dto.assignmentId,
        createdById: actor.id,
      },
    });
    await this.auditService.log({
      entityType: 'Settlement',
      entityId: settlement.id,
      action: 'CREATE',
      afterData: settlement,
      changedBy: actor.id,
    });
    return this.findOne(settlement.id);
  }

  async update(id: string, dto: UpdateSettlementDto) {
    const before = await this.findOne(id);
    const settlement = await this.prisma.settlement.update({
      where: { id },
      data: {
        amount: dto.amount,
        note: dto.note,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        customCategoryName: dto.customCategoryName,
      },
    });
    await this.auditService.log({
      entityType: 'Settlement',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: settlement,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.settlement.delete({ where: { id } });
    await this.auditService.log({ entityType: 'Settlement', entityId: id, action: 'DELETE' });
    return { message: 'Settlement deleted' };
  }

  async exportByProvider(providerId: string, startDate?: string, endDate?: string) {
    const assignmentWhere: any = { providerId };

    if (startDate || endDate) {
      assignmentWhere.startDate = {};
      if (startDate) assignmentWhere.startDate.gte = new Date(startDate);
      if (endDate) assignmentWhere.startDate.lte = new Date(endDate);
    }

    const assignments = await this.prisma.assignment.findMany({
      where: assignmentWhere,
      include: {
        driver: { select: { id: true, name: true, email: true } },
        vehicle: { select: { id: true, plateNumber: true, capacity: true } },
        bookings: { select: { id: true, bookingRef: true, customerName: true, totalPax: true } },
        settlements: true,
      },
      orderBy: { startDate: 'desc' },
    });

    const provider = await this.prisma.transportationProvider.findUnique({
      where: { id: providerId },
      select: { id: true, name: true },
    });

    // Group by driver
    const driverMap = new Map<string, any>();
    for (const a of assignments) {
      const driverId = a.driverId ?? 'unknown';
      if (!driverMap.has(driverId)) {
        driverMap.set(driverId, {
          driver: a.driver,
          assignments: [],
          totalAmount: 0,
        });
      }
      const entry = driverMap.get(driverId);
      const totalSettlement = (a.settlements ?? []).reduce(
        (sum: number, s: any) => sum + Number(s.amount ?? 0),
        0,
      );
      entry.assignments.push({
        id: a.id,
        code: a.code,
        tourName: a.tourName,
        vehicle: a.vehicle,
        bookingCount: a.bookings?.length ?? 0,
        totalAmount: totalSettlement,
        status: a.status,
        createdAt: a.createdAt,
      });
      entry.totalAmount += totalSettlement;
    }

    return {
      provider,
      period: { startDate, endDate },
      drivers: Array.from(driverMap.values()),
      totalAmount: assignments.reduce(
        (sum, a) => sum + (a.settlements ?? []).reduce((s: number, st: any) => s + Number(st.amount ?? 0), 0),
        0,
      ),
    };
  }
}
