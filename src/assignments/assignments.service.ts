import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import {
  AssignBookingsDto,
  CreateAssignmentDto,
  QueryAssignmentDto,
  UpdateAssignmentDto,
  UpdateAssignmentStatusDto,
} from './dto/assignment.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AssignmentStatus, BookingStatus, PayeeType, SettlementStatus, RoleType } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private include = {
    bookings: { orderBy: { paxSequence: 'asc' as const } },
    vehicle: true,
    provider: true,
    driver: { select: { id: true, name: true, email: true } },
    guide: { select: { id: true, name: true, email: true } },
    settlement: true,
  };

  async findBoard(actor: AuthenticatedUser) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const where: any = {
      status: { not: AssignmentStatus.CANCELED },
      endDate: { gte: startOfToday },
    };
    if (actor.role !== RoleType.ADMIN) {
      where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
    }

    const items = await this.prisma.assignment.findMany({
      where,
      include: this.include,
      orderBy: [{ startDate: 'asc' }],
    });

    return items.map((a) => {
      const totalPax = a.bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
      const type = a.bookings.find((b) => b.tourType)?.tourType ?? null;
      const tourName =
        a.bookings.find((b) => b.tourName)?.tourName ?? a.code ?? 'Tour';
      const durationDays =
        a.endDate && a.startDate
          ? Math.max(1, Math.round((a.endDate.getTime() - a.startDate.getTime()) / 86400000) + 1)
          : 1;
      return { ...a, totalPax, tourType: type, tourName, durationDays };
    });
  }

  async findAll(query: QueryAssignmentDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const { page, limit, q, status, vehicleId, driverId, guideId } = query;
    const where: any = {};
    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { vehicle: { is: { plateNumber: { contains: q, mode: 'insensitive' } } } },
        { driver: { is: { name: { contains: q, mode: 'insensitive' } } } },
        { guide: { is: { name: { contains: q, mode: 'insensitive' } } } },
        { provider: { is: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;
    if (guideId) where.guideId = guideId;
    if (actor.role !== RoleType.ADMIN) {
      where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
    }

    const [items, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        include: this.include,
        orderBy: [{ startDate: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.assignment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: this.include,
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async create(dto: CreateAssignmentDto) {
    const assignment = await this.prisma.assignment.create({
      data: {
        code: dto.code,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        vehicleId: dto.vehicleId,
        providerId: dto.providerId,
        driverId: dto.driverId,
        guideId: dto.guideId,
        status: dto.status,
        sequenceIndex: dto.sequenceIndex,
        priceOverride: dto.priceOverride,
        tripNotes: dto.tripNotes,
      },
    });
    await this.auditService.log({
      entityType: 'Assignment',
      entityId: assignment.id,
      action: 'CREATE',
      afterData: assignment,
    });
    return this.findOne(assignment.id);
  }

  async update(id: string, dto: UpdateAssignmentDto) {
    const before = await this.findOne(id);
    const assignment = await this.prisma.assignment.update({
      where: { id },
      data: {
        code: dto.code,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        vehicleId: dto.vehicleId,
        providerId: dto.providerId,
        driverId: dto.driverId,
        guideId: dto.guideId,
        status: dto.status,
        sequenceIndex: dto.sequenceIndex,
        priceOverride: dto.priceOverride,
        tripNotes: dto.tripNotes,
      },
    });
    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: assignment,
    });
    return this.findOne(id);
  }

  async updateStatus(id: string, dto: UpdateAssignmentStatusDto) {
    const before = await this.findOne(id);
    if (dto.status === before.status) return before;

    // Chuyển trạng thái booking tương ứng.
    if (dto.status === AssignmentStatus.DISPATCHED) {
      await this.prisma.booking.updateMany({
        where: { assignmentId: id, status: BookingStatus.PENDING },
        data: { status: BookingStatus.ASSIGNED },
      });
    } else if (dto.status === AssignmentStatus.CANCELED) {
      await this.prisma.booking.updateMany({
        where: { assignmentId: id, status: BookingStatus.ASSIGNED },
        data: { status: BookingStatus.PENDING, assignmentId: null },
      });
    }

    const assignment = await this.prisma.assignment.update({
      where: { id },
      data: { status: dto.status },
      include: this.include,
    });

    // COMPLETED → kích hoạt Settlement (nếu chưa có).
    if (dto.status === AssignmentStatus.COMPLETED) {
      await this.ensureSettlement(assignment);
    }

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: `UPDATE_STATUS:${dto.status}`,
      beforeData: { status: before.status },
      afterData: { status: dto.status },
    });
    return this.findOne(id);
  }

  private async ensureSettlement(assignment: any) {
    if (assignment.settlement) return;

    // Settlement cho nhà xe (V_PROVIDER); nếu không có nhà xe thì cho HDV.
    if (assignment.providerId) {
      await this.prisma.settlement.create({
        data: {
          assignmentId: assignment.id,
          payeeType: PayeeType.V_PROVIDER,
          providerId: assignment.providerId,
          baseAmount: assignment.priceOverride ?? 0,
          finalAmount: assignment.priceOverride ?? 0,
          status: SettlementStatus.PENDING,
        },
      });
    } else if (assignment.guideId) {
      await this.prisma.settlement.create({
        data: {
          assignmentId: assignment.id,
          payeeType: PayeeType.FREELANCE_GUIDE,
          userId: assignment.guideId,
          baseAmount: 0,
          finalAmount: 0,
          status: SettlementStatus.PENDING,
        },
      });
    }
  }

  async assignBookings(id: string, dto: AssignBookingsDto) {
    const assignment = await this.findOne(id);
    const existing = await this.prisma.booking.findMany({
      where: { id: { in: dto.bookingIds } },
      select: { id: true, assignmentId: true },
    });
    const busy = existing.find((b) => b.assignmentId && b.assignmentId !== id);
    if (busy) {
      throw new BadRequestException(`Booking ${busy.id} is already assigned to another assignment`);
    }

    const maxSeq = await this.prisma.booking.aggregate({
      where: { assignmentId: id },
      _max: { paxSequence: true },
    });

    await this.prisma.$transaction(
      dto.bookingIds.map((bookingId, i) =>
        this.prisma.booking.update({
          where: { id: bookingId },
          data: { assignmentId: id, paxSequence: (maxSeq._max.paxSequence ?? 0) + i + 1 },
        }),
      ),
    );

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'ASSIGN_BOOKINGS',
      afterData: { bookingIds: dto.bookingIds },
    });
    return this.findOne(id);
  }

  async removeBooking(id: string, bookingId: string) {
    await this.findOne(id);
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.assignmentId !== id) {
      throw new NotFoundException('Booking not in this assignment');
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { assignmentId: null, paxSequence: 0 },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.booking.updateMany({
      where: { assignmentId: id },
      data: { assignmentId: null, paxSequence: 0 },
    });
    await this.prisma.assignment.delete({ where: { id } });
    await this.auditService.log({ entityType: 'Assignment', entityId: id, action: 'DELETE' });
    return { message: 'Assignment deleted' };
  }
}
