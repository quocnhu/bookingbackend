import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Booking,
  BookingProvider,
  BookingStatus,
  PaymentStatus,
  RoleType,
  TourType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import {
  BookingNormalizerService,
  CleanBookingData,
} from '@/parsing/booking-normalizer.service';
import { ASSIGNMENT_JOB, ASSIGNMENT_QUEUE } from '@/queues/queue.constants';
import {
  CreateBookingDto,
  QueryBookingDto,
  UpdateBookingDto,
} from './dto/booking.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

export type WriteResult =
  | { status: 'SKIPPED'; reason: string; booking?: undefined }
  | { status: 'PROCESSED'; booking?: Booking | null };

/**
 * Service trung tâm cho Booking: CRUD (dashboard) + upsert từ pipeline
 * (theo .md bước 17) keyed trên (source, confirmationCode) — idempotent,
 * re-processing cập nhật chứ không nhân đôi.
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly normalizer: BookingNormalizerService,
    @InjectQueue(ASSIGNMENT_QUEUE) private readonly assignmentQueue: Queue,
  ) {}

  // ─── Pipeline upsert (Stage 2) ──────────────────────────────────────────
  async upsert(
    data: CleanBookingData,
    rawDataId?: string,
    actorId?: string,
  ): Promise<Booking> {
    const bookingRef = data.bookingRef;
    const existing = await this.findExisting(data.source, bookingRef);

    const bookingData: {
      bookingRef: string;
      confirmationCode?: string;
      source?: string;
      channel: BookingProvider;
      status: BookingStatus;
      tourId?: string;
      tourName?: string;
      tourType?: TourType;
      address?: string;
      latitude?: number;
      longitude?: number;
      startingDate?: Date;
      customerName?: string;
      hotelName?: string;
      phone?: string;
      mail?: string;
      totalPax?: number;
      paxDetail?: string;
      payment?: PaymentStatus;
      isNoShow?: boolean;
      noShowReason?: string;
      rawDataId?: string;
    } = {
      bookingRef,
      confirmationCode: data.bookingRef,
      source: data.source,
      channel:
        this.normalizer.channelForSource(data.source) ??
        data.channel ??
        BookingProvider.WEBSITE,
      status:
        data.action === 'CANCEL'
          ? BookingStatus.CANCELED
          : (data.status ?? BookingStatus.PENDING),
      tourId: data.tourId,
      tourName: data.tourName,
      tourType: data.tourType,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      startingDate: data.startingDate ? new Date(data.startingDate) : undefined,
      customerName: data.customerName,
      hotelName: data.hotelName,
      phone: data.phone,
      mail: data.mail,
      totalPax: data.totalPax ?? 0,
      paxDetail: data.paxDetail,
      payment: data.payment,
      isNoShow: data.isNoShow,
      noShowReason: data.noShowReason,
      rawDataId: existing?.rawDataId ?? rawDataId,
    };

    if (existing) {
      const booking = await this.prisma.booking.update({
        where: { id: existing.id },
        data: { ...bookingData, rawDataId: existing.rawDataId ?? rawDataId },
      });
      await this.auditService.log({
        entityType: 'Booking',
        entityId: booking.id,
        action: 'UPSERT_EMAIL',
        beforeData: {
          source: existing.source,
          bookingRef: existing.bookingRef,
        },
        afterData: booking,
        changedBy: actorId ?? null,
      });
      return booking;
    }

    const booking = await this.prisma.booking.create({ data: bookingData });
    await this.auditService.log({
      entityType: 'Booking',
      entityId: booking.id,
      action: 'CREATE_EMAIL',
      afterData: booking,
      changedBy: actorId ?? null,
    });
    this.logger.log(`Upserted booking ${booking.bookingRef} (${data.source})`);
    return booking;
  }

  /** Tạo booking thủ công (queue `booking-manual`), vẫn đẩy sang assignment. */
  async createManual(
    data: Record<string, any>,
    actorId?: string,
  ): Promise<Booking> {
    const bookingRef = data.bookingRef ?? data.confirmationCode;
    if (!bookingRef)
      throw new BadRequestException(
        'bookingRef (hoặc confirmationCode) là bắt buộc',
      );

    const existing = await this.prisma.booking.findUnique({
      where: { bookingRef },
    });
    if (existing)
      throw new ConflictException('Booking reference already exists');

    const clean: CleanBookingData = {
      action: 'CREATE',
      bookingRef,
      source: data.source ?? 'manual',
      channel: data.channel ?? BookingProvider.MANUAL,
      tourId: data.tourId,
      tourName: data.tourName,
      tourType: data.tourType,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      startingDate: data.startingDate
        ? new Date(data.startingDate).toISOString()
        : undefined,
      customerName: data.customerName,
      hotelName: data.hotelName,
      phone: data.phone,
      mail: data.mail,
      totalPax: data.totalPax,
      paxDetail: data.paxDetail,
      payment: data.payment,
      isNoShow: data.isNoShow,
      noShowReason: data.noShowReason,
    };
    const booking = await this.upsert(clean, undefined, actorId);
    await this.enqueueAssignment(booking.id);
    return booking;
  }

  private async findExisting(source: string | undefined, bookingRef: string) {
    if (source && bookingRef) {
      const byKey = await this.prisma.booking.findUnique({
        where: {
          source_confirmationCode: { source, confirmationCode: bookingRef },
        },
      });
      if (byKey) return byKey;
    }
    return this.prisma.booking.findUnique({ where: { bookingRef } });
  }

  private async enqueueAssignment(bookingId: string) {
    await this.assignmentQueue.add(
      ASSIGNMENT_JOB,
      { bookingId },
      {
        jobId: `assign-${bookingId}`,
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }

  // ─── CRUD (dashboard) ───────────────────────────────────────────────────
  async findAll(
    query: QueryBookingDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResult<any>> {
    const { page, limit, q, status, channel, payment, tourId, assignmentId } =
      query;
    const where: any = {};
    if (q) {
      where.OR = [
        { bookingRef: { contains: q, mode: 'insensitive' } },
        { confirmationCode: { contains: q, mode: 'insensitive' } },
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
      where.assignment = {
        OR: [{ driverId: actor.id }, { guideId: actor.id }],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          tour: { select: { id: true, name: true, type: true, durationDays: true } },
        },
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
    const existing = await this.prisma.booking.findUnique({
      where: { bookingRef: dto.bookingRef },
    });
    if (existing)
      throw new ConflictException('Booking reference already exists');
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
    await this.auditService.log({
      entityType: 'Booking',
      entityId: id,
      action: 'DELETE',
    });
    return { message: 'Booking deleted' };
  }
}
