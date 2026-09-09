import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { AssignmentBoardService } from '@/queues/assignment-board.service';
import { AssignmentQueue } from '@/queues/assignment.queue';
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
    private readonly board: AssignmentBoardService,
    private readonly assignmentQueue: AssignmentQueue,
  ) {}

  // ─── Pipeline upsert (Stage 2) ──────────────────────────────────────────
  async upsert(
    data: CleanBookingData,
    rawDataId?: string,
    actorId?: string,
    createdWho?: string,
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
      hotelName: string;
      phone: string;
      mail?: string;
totalPax?: number;
      paxDetail?: string;
      payment?: PaymentStatus;
      isNoShow?: boolean;
      noShowReason?: string;
      rawDataId?: string;
      createdWho?: string;
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
      hotelName: data.hotelName ?? '',
      phone: data.phone ?? '',
      mail: data.mail,
      totalPax: data.totalPax ?? 0,
      paxDetail: data.paxDetail,
      payment: data.payment,
      isNoShow: data.isNoShow,
      noShowReason: data.noShowReason,
      rawDataId: existing?.rawDataId ?? rawDataId,
    };

    const _createdWho = createdWho ?? (actorId ? undefined : 'Pub-Sub System');

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
      await this.postWrite(booking);
      return booking;
    }

    const booking = await this.prisma.booking.create({ data: { ...bookingData, createdWho: _createdWho } });
    await this.auditService.log({
      entityType: 'Booking',
      entityId: booking.id,
      action: 'CREATE_EMAIL',
      afterData: booking,
      changedBy: actorId ?? null,
    });
    this.logger.log(`Upserted booking ${booking.bookingRef} (${data.source})`);
    await this.postWrite(booking);
    return booking;
  }

  /**
   * Sau khi ghi booking (tạo mới / cập nhật từ pipeline):
   * - đơn CANCELLED → rút khỏi chuyến hiện tại (nếu có).
   * - đơn còn hiệu lực, chưa xếp chuyến → enqueue auto-assign (Stage 3).
   */
  private async postWrite(booking: Booking) {
    if (booking.status === BookingStatus.CANCELED) {
      await this.board.unassign(booking.id);
      return;
    }
    if (!booking.assignmentId && booking.startingDate) {
      await this.assignmentQueue.enqueue(booking.id);
    }
  }

  /** Tạo booking thủ công (queue `booking-manual`), vẫn đẩy sang assignment. */
  async createManual(
    data: Record<string, any>,
    actorId?: string,
  ): Promise<Booking> {
    const bookingRef =
      data.bookingRef ||
      data.confirmationCode ||
      (await this.generateManualBookingRef(data.tourType));

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
    const booking = await this.upsert(clean, undefined, actorId, data.createdWho ?? 'Manual Entry');
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

  /** Sinh mã thủ công cho booking: <PRV|GR|MB>-YYYYMMDD-#### (tăng dần theo ngày). */
  private async generateManualBookingRef(tourType?: TourType): Promise<string> {
    const prefixCode =
      tourType === TourType.PRIVATE_TOUR
        ? 'PRV'
        : tourType === TourType.GROUP_TOUR
          ? 'GR'
          : 'MB';
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const prefix = `${prefixCode}-${ymd}-`;
    const count = await this.prisma.booking.count({
      where: { bookingRef: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  // ─── CRUD (dashboard) ───────────────────────────────────────────────────
  async findAll(
    query: QueryBookingDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResult<any>> {
    const { page, limit, status, channel, payment, tourId, assignmentId } =
      query;
    const where: any = {};
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

  async create(dto: CreateBookingDto, actor?: AuthenticatedUser) {
    const bookingRef = dto.bookingRef || (await this.generateManualBookingRef(dto.tourType));
    const existing = await this.prisma.booking.findUnique({
      where: { bookingRef },
    });
    if (existing)
      throw new ConflictException('Booking reference already exists');
    const data: any = { ...dto, bookingRef };
    if (dto.startingDate) data.startingDate = new Date(dto.startingDate);
    data.createdWho = actor?.name ?? actor?.email ?? 'System';
    const booking = await this.prisma.booking.create({ data });
    await this.auditService.log({
      entityType: 'Booking',
      entityId: booking.id,
      action: 'CREATE',
      afterData: booking,
    });
    await this.postWrite(booking);
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
    await this.postWrite(booking);
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
