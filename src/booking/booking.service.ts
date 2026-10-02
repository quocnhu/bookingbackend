import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
  BookingPatchDto,
  QueryBookingDto,
  UpdateBookingDto,
} from './dto/booking.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

export type WriteResult =
  | { status: 'SKIPPED'; reason: string; booking?: undefined }
  | { status: 'PROCESSED'; booking?: Booking | null };

/**
 * Central service for Booking: CRUD (dashboard) + upsert from the pipeline
 * (per the .md step 17), keyed on (source, confirmationCode) — idempotent,
 * re-processing updates rather than duplicating.
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

    // Auto-populate tourName from tourId if not provided
    let tourName = data.tourName;
    let tourType = data.tourType;
    if (data.tourId && (!tourName || !tourType)) {
      const tour = await this.prisma.tour.findUnique({
        where: { id: data.tourId },
        select: { name: true, type: true },
      });
      if (tour) {
        tourName ??= tour.name;
        tourType ??= tour.type;
      }
    }

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
      tourName,
      tourType,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      startingDate: data.startingDate
        ? new Date(data.startingDate)
        : undefined,
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

    const booking = await this.prisma.booking.create({
      data: { ...bookingData, createdWho: _createdWho },
    });
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
   * After writing a booking (new / updated from the pipeline):
   * - CANCELLED booking → remove it from the current trip (if any).
   * - still-valid booking with no trip yet → enqueue auto-assign (Stage 3).
   *   (The worker itself honors the global MANUAL toggle, so every booking is
   *   always enqueued — the mode decision lives in one place: the processor.)
   * EXTENSION POINT (auto/manual): to skip the queue per channel/source (e.g.
   * manual-only channels), add the condition here as needed.
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

  /** Manually create a booking (queue `booking-manual`), still pushed to assignment. */
  async createManual(
    data: Record<string, any>,
    actorId?: string,
  ): Promise<Booking> {
    const bookingRef =
      data.bookingRef ||
      data.confirmationCode ||
      this.randomBookingRef(data.tourType);

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
      ? new Date(data.startingDate + 'T00:00:00.000+07:00').toISOString()
      : undefined,
      customerName: data.customerName,
      hotelName: data.hotelName,
      phone: data.phone,
      mail: data.mail,
      totalPax: data.totalPax,
      paxDetail: data.paxDetail,
      payment: data.payment ?? PaymentStatus.PAID,
      isNoShow: data.isNoShow,
      noShowReason: data.noShowReason,
    };
    const booking = await this.upsert(
      clean,
      undefined,
      actorId,
      data.createdWho ?? 'Manual Entry',
    );
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

  /**
   * Preview the booking ref for a tour type, so the "Add Booking" form can fill
   * the Booking Ref field as soon as the Tour type is selected.
   *
   * Because the ref is random, the preview and the real ref are two different
   * values — that's fine, the DB commits the real ref at POST time and UNIQUE
   * blocks duplicates.
   */
  async previewBookingRef(tourType?: TourType): Promise<string> {
    return this.randomBookingRef(tourType);
  }

  /**
   * Generates a booking ref: <PRV|GR|MB>-<uuid v4>.
   *
   * On security:
   * - Uses `crypto.randomUUID()` (the OS CSPRNG), NOT `Math.random()` — the
   *   latter is guessable and unacceptable for an identifier. No extra library
   *   needs to be installed.
   * - Keeps the tour type prefix so staff can tell Group/Private at a glance,
   *   and for easier filtering. The prefix is a public constant and carries no
   *   secret information.
   * - 122 random bits: the collision probability is negligible in practical use.
   *
   * `bookingRef` is UNIQUE in the DB (`Booking_bookingRef_key`), so manually
   * entered refs still have a final layer of protection.
   */
  private randomBookingRef(tourType?: TourType): string {
    const prefixCode =
      tourType === TourType.PRIVATE_TOUR
        ? 'PRV'
        : tourType === TourType.GROUP_TOUR
          ? 'GR'
          : 'MB';
    return `${prefixCode}-${randomUUID()}`;
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
          tour: {
            select: { id: true, name: true, type: true, durationDays: true },
          },
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
    this.assertEmailForChannel(dto);

    // The ref sent by the client is only a PREVIEW — two people may preview the
    // same ref and both click save. If that ref collides, issue a new one
    // instead of reporting an error. A hand-typed ref (not matching the
    // pattern) keeps the existing behaviour: report the duplicate.
    const submitted = dto.bookingRef?.trim();
    let bookingRef = submitted || this.randomBookingRef(dto.tourType);
    let booking: Booking | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data: any = { ...dto, bookingRef };
        if (dto.startingDate) data.startingDate = new Date(dto.startingDate);
        if (!data.payment) data.payment = PaymentStatus.PAID;
        data.createdWho = actor?.name ?? actor?.email ?? 'System';
        booking = await this.prisma.booking.create({ data });
        break;
      } catch (e) {
        const isUniqueViolation = (e as { code?: string })?.code === 'P2002';
        if (!isUniqueViolation || !this.looksGenerated(bookingRef) || attempt === 2) {
          throw e;
        }
        this.logger.warn(
          `Booking ref is duplicated, issuing a new ref (attempt ${attempt + 1})`,
        );
        bookingRef = this.randomBookingRef(dto.tourType);
      }
    }
    if (!booking) throw new ConflictException('Booking reference already exists');

    await this.auditService.log({
      entityType: 'Booking',
      entityId: booking.id,
      action: 'CREATE',
      afterData: booking,
    });
    await this.postWrite(booking);
    return booking;
  }

  /**
   * Refs generated by the system: <PRV|GR|MB>-<uuid v4>.
   *
   * Matched STRICTLY per RFC 4122 (8-4-4-4-12 hex) so hand-typed refs do not
   * match by accident, and so a future format change does not swallow user
   * refs. The `i` flag allows upper/lower case.
   */
  private looksGenerated(bookingRef: string): boolean {
    return /^(PRV|GR|MB)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      bookingRef,
    );
  }

  /**
   * The admin Add Booking form requires an email; the public tour booking form
   * on the website does not (a guest may have no email). The DTO cannot tell
   * them apart, so this is checked here based on `channel`.
   */
  private assertEmailForChannel(dto: CreateBookingDto): void {
    if (dto.channel === BookingProvider.WEBSITE) return;
    if (!dto.mail?.trim()) {
      throw new BadRequestException('Email is required');
    }
  }

  async update(id: string, dto: UpdateBookingDto) {
    const before = await this.findOne(id);

    // Check if booking is locked due to tour report submission
    if (before.assignmentId) {
      const assignment = await this.prisma.assignment.findUnique({
        where: { id: before.assignmentId },
        include: { tourReport: true },
      });
      const locked = assignment?.tourReport?.status === 'SUBMITTED' || assignment?.tourReport?.status === 'VERIFIED';
      if (locked) {
        throw new BadRequestException(
          'This booking is locked because the tour report has been submitted for verification. Only accounting can unlock by rejecting the report.',
        );
      }
    }

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

  /**
   * A guide/driver may only edit the notes of bookings that belong to a trip
   * they are responsible for. Admin/Office have `booking.update` and skip this
   * check.
   */
  private async assertCanPatchBookings(
    bookingIds: string[],
    actor: AuthenticatedUser,
  ) {
    if (actor.permissions?.includes('booking.update')) return;

    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: { id: true, assignmentId: true },
    });
    if (bookings.length !== bookingIds.length) {
      throw new NotFoundException('Booking not found');
    }

    const assignmentIds = [
      ...new Set(
        bookings.map((b) => b.assignmentId).filter((v): v is string => !!v),
      ),
    ];
    if (assignmentIds.length === 0) {
      throw new ForbiddenException(
        'Booking is not assigned to a bus yet, so it cannot be edited',
      );
    }

    const owned = await this.prisma.assignment.findMany({
      where: {
        id: { in: assignmentIds },
        OR: [{ guideId: actor.id }, { driverId: actor.id }],
      },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((a) => a.id));
    const blocked = assignmentIds.filter((id) => !ownedIds.has(id));
    if (blocked.length > 0) {
      throw new ForbiddenException(
        'You can only edit the notes of bookings on trips you are responsible for',
      );
    }
  }

  /** Quickly update the notes of many bookings at once (Dispatch Board). */
  async updateBatch(items: BookingPatchDto[], actor: AuthenticatedUser) {
    if (items.length === 0) return [];
    await this.assertCanPatchBookings(
      items.map((i) => i.id),
      actor,
    );

    // Check for locked bookings (tour report submitted for verification)
    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      include: { assignment: { include: { tourReport: true } } },
    });
    for (const booking of bookings) {
      const locked = booking.assignment?.tourReport?.status === 'SUBMITTED' || booking.assignment?.tourReport?.status === 'VERIFIED';
      if (locked) {
        throw new BadRequestException(
          `Booking ${booking.bookingRef} is locked because the tour report has been submitted for verification. Only accounting can unlock by rejecting the report.`,
        );
      }
    }

    const updated = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.booking.update({
          where: { id: item.id },
          data: {
            ...(item.notes !== undefined ? { notes: item.notes } : {}),
          },
        }),
      ),
    );
    await this.auditService.log({
      entityType: 'Booking',
      entityId: items.map((i) => i.id).join(','),
      action: 'UPDATE_BATCH',
      afterData: { count: items.length },
      changedBy: actor.id,
    });
    for (const b of updated) await this.postWrite(b);
    return updated;
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
