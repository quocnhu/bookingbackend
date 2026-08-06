import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { CreateBookingDto, QueryBookingDto, UpdateBookingDto } from './dto/booking.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { RoleType } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryBookingDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const { page, limit, q, status, channel, payment, tourId, assignmentId } = query;
    const where: any = {};
    if (q) {
      where.OR = [
        { bookingRef: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { mail: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { tourName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (payment) where.payment = payment;
    if (tourId) where.tourId = tourId;
    if (assignmentId) where.assignmentId = assignmentId;
    if (actor.role !== RoleType.ADMIN) {
      where.assignment = { OR: [{ driverId: actor.id }, { guideId: actor.id }] };
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: { tour: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { tour: true, rawData: { select: { payload: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async create(dto: CreateBookingDto) {
    const existing = await this.prisma.booking.findUnique({ where: { bookingRef: dto.bookingRef } });
    if (existing) throw new ConflictException('Booking reference already exists');
    const data: any = { ...dto };
    if (dto.startingDate) data.startingDate = new Date(dto.startingDate);
    const booking = await this.prisma.booking.create({ data });
    await this.auditService.log({
      entityType: 'Booking',
      entityId: booking.id,
      action: 'CREATE',
      afterData: booking,
    });
    return booking;
  }

  async update(id: string, dto: UpdateBookingDto) {
    const before = await this.findOne(id);
    const data: any = { ...dto };
    if (dto.startingDate) data.startingDate = new Date(dto.startingDate);
    const booking = await this.prisma.booking.update({ where: { id }, data });
    await this.auditService.log({
      entityType: 'Booking',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: booking,
    });
    return booking;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.booking.delete({ where: { id } });
    await this.auditService.log({ entityType: 'Booking', entityId: id, action: 'DELETE' });
    return { message: 'Booking deleted' };
  }
}
