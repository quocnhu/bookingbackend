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
  Prisma,
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
import {
  CANCEL_WINDOW_HOURS,
  cancelDeadline,
} from '@/common/constants/cancellation';
import {
  buildEmailUpdateData,
  EmailFields,
  hasBookingChanges,
} from './email-merge.util';
import {
  RAW_DATA_OUTCOME,
  RawDataOutcome,
} from '@/raw-data/raw-data.entity';

export type WriteResult =
  | { status: 'SKIPPED'; reason: string; booking?: undefined }
  | { status: 'PROCESSED'; booking?: Booking | null };

/** Minimum name-match confidence before a parsed booking is linked to a Tour. */
const TOUR_MATCH_MIN_SCORE = 0.5;

/**
 * Normalize a tour name for comparison: lowercase, drop the OTA product-code
 * prefix ("107622P19 - ..."), parentheticals ("(Max 10)") and punctuation.
 */
function normalizeTourName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^\s*[a-z0-9]{4,}\s*[-–—:]\s*/i, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Token-set overlap (intersection / smaller set) in the range 0..1. */
function tokenOverlap(a: string, b: string): number {
  const A = new Set(a.split(' ').filter(Boolean));
  const B = new Set(b.split(' ').filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let common = 0;
  for (const t of A) if (B.has(t)) common += 1;
  return common / Math.min(A.size, B.size);
}

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
  /**
   * Apply one parsed email to the Booking table.
   *
   * The booking is keyed on (source, confirmationCode): re-processing the same
   * reference updates the existing row instead of creating a second one.
   *
   * Three kinds of email reach this method:
   *  - CREATE — a new booking, or a re-sent confirmation of a known one
   *  - MODIFY — an amendment: the SAME reference with different details
   *  - CANCEL — the booking was cancelled
   *
   * `created` tells the caller whether the row was INSERTED (true) or UPDATED
   * (false), so the rawData row can be linked as the ORIGIN of the booking or
   * as an AMENDMENT of it.
   */
  async upsert(
    data: CleanBookingData,
    rawDataId?: string,
    actorId?: string,
    createdWho?: string,
    emailDate?: Date,
  ): Promise<{ booking: Booking; created: boolean; outcome: RawDataOutcome }> {
    const bookingRef = data.bookingRef;
    const existing = await this.findExisting(data.source, bookingRef);
    const isAmendment = data.action === 'MODIFY';

    // Auto-populate tourName from tourId if not provided
    let tourName = data.tourName;
    let tourType = data.tourType;
    let tourId = data.tourId;
    if (tourId && (!tourName || !tourType)) {
      const tour = await this.prisma.tour.findUnique({
        where: { id: tourId },
        select: { name: true, type: true },
      });
      if (tour) {
        tourName ??= tour.name;
        tourType ??= tour.type;
      }
    }
    // Reverse: parsed bookings only carry the OTA product name. Match it against
    // the Tours table so the booking is linked to a Tour and the dashboard can
    // show that Tour's Duration (Tour.durationDays). Never guess: below the
    // confidence threshold the booking stays unlinked.
    if (!tourId && tourName) {
      const matched = await this.resolveTourByName(tourName, tourType);
      if (matched) {
        tourId = matched.id;
        tourType ??= matched.type;
        this.logger.log(
          `Linked booking ${bookingRef} to tour "${matched.name}" (name match)`,
        );
      }
    }

    // The parsed values, WITHOUT defaults — an amendment email must only
    // write the fields it actually carried, otherwise a mail that mentions
    // only the new date silently blanks the hotel, the phone and the pax
    // count (see buildEmailUpdateData).
    const parsed: EmailFields = {
      bookingRef,
      source: data.source,
      channel:
        data.channel ??
        this.normalizer.channelForSource(data.source) ??
        BookingProvider.WEBSITE,
      tourId,
      tourName,
      tourType,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      startingDate: data.startingDate ? new Date(data.startingDate) : undefined,
      departureTime: data.departureTime,
      customerName: data.customerName,
      hotelName: data.hotelName,
      phone: data.phone,
      mail: data.mail,
      totalPax: data.totalPax,
      paxDetail: data.paxDetail,
      payment: data.payment,
      isNoShow: data.isNoShow,
      noShowReason: data.noShowReason,
      extra: data.extra as unknown as Prisma.InputJsonValue | undefined,
      emailDate: emailDate ?? existing?.emailDate ?? undefined,
    };

    const _createdWho = createdWho ?? (actorId ? undefined : 'Pub-Sub System');

    if (existing) {
      // Ordering guard: an older email must never overwrite newer state —
      // e.g. a stale booking confirmation cannot undo a later cancellation.
      if (
        emailDate &&
        existing.emailDate &&
        emailDate.getTime() < existing.emailDate.getTime()
      ) {
        this.logger.log(
          `Skipped stale email for ${bookingRef}: email ${emailDate.toISOString()} older than applied ${existing.emailDate.toISOString()}`,
        );
        return {
          booking: existing,
          created: false,
          outcome: RAW_DATA_OUTCOME.SKIPPED,
        };
      }

      // State machine — CANCELED is TERMINAL for this confirmation code
      // (standard booking lifecycle: active → CANCELED, no casual reopening).
      // Only a strictly NEWER booking email (rebooking with the same ref)
      // may reactivate it; an email with a missing/older date never can.
      if (
        existing.status === BookingStatus.CANCELED &&
        data.action !== 'CANCEL' &&
        !(
          emailDate &&
          existing.emailDate &&
          emailDate.getTime() > existing.emailDate.getTime()
        )
      ) {
        this.logger.log(
          `Ignored reactivation of canceled booking ${bookingRef}: no newer email date to justify leaving terminal state`,
        );
        return {
          booking: existing,
          created: false,
          outcome: RAW_DATA_OUTCOME.SKIPPED,
        };
      }

      const updateData = this.buildEmailUpdateData(parsed, existing, data.action);
      const changed = hasBookingChanges(
        updateData,
        existing as unknown as Record<string, unknown>,
      );
      const booking = await this.prisma.booking.update({
        where: { id: existing.id },
        data: updateData,
      });
      await this.auditService.log({
        entityType: 'Booking',
        entityId: booking.id,
        action: isAmendment ? 'AMEND_EMAIL' : 'UPSERT_EMAIL',
        // The full before-image, so the audit trail shows WHAT the amendment
        // changed (the old code only stored {source, bookingRef}).
        beforeData: existing,
        afterData: booking,
        changedBy: actorId ?? null,
      });
      if (isAmendment) {
        this.logger.log(
          `Applied amendment to booking ${bookingRef} (${data.source})`,
        );
      }

      // An amendment can move the passenger to another day — the trip it sits
      // on must follow, otherwise the bus keeps the old date.
      if (
        booking.assignmentId &&
        this.dateChanged(existing.startingDate, booking.startingDate)
      ) {
        await this.board.syncDatesFromBookings(booking.assignmentId);
      }

      await this.postWrite(booking);
      return {
        booking,
        created: false,
        outcome: this.outcomeFor(data.action, changed),
      };
    }

    if (isAmendment) {
      // An amendment for a booking we never saw: the email carries the full
      // details, so the booking is created from it and the row becomes the
      // origin of that booking.
      this.logger.warn(
        `Amendment email for unknown booking ${bookingRef} (${data.source}) — created from the amendment`,
      );
    }

    const booking = await this.prisma.booking.create({
      data: {
        ...parsed,
        confirmationCode: data.bookingRef,
        status:
          data.action === 'CANCEL'
            ? BookingStatus.CANCELED
            : (data.status ?? BookingStatus.PENDING),
        // A brand-new booking always carries a usable hotel / phone / pax
        // count — the dashboard and the bus sheet depend on them.
        hotelName: parsed.hotelName ?? '',
        phone: parsed.phone ?? '',
        totalPax: parsed.totalPax ?? 0,
        rawDataId,
        createdWho: _createdWho,
      },
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
    return {
      booking,
      created: true,
      outcome: RAW_DATA_OUTCOME.CREATED,
    };
  }

  /**
   * What the system did with an email that reached an existing booking.
   *
   *  - CANCEL → the booking was cancelled
   *  - changed → the booking was updated (an amendment, or a corrected
   *    confirmation)
   *  - nothing changed → a re-sent confirmation of a booking we already have
   */
  private outcomeFor(
    action: 'CREATE' | 'MODIFY' | 'CANCEL',
    changed: boolean,
  ): RawDataOutcome {
    if (action === 'CANCEL') return RAW_DATA_OUTCOME.CANCELLED;
    return changed
      ? RAW_DATA_OUTCOME.UPDATED
      : RAW_DATA_OUTCOME.UNCHANGED;
  }

  /**
   * Field-level merge for an email-driven update — see `buildEmailUpdateData`
   * (extracted so it can be unit-tested without a database).
   */
  private buildEmailUpdateData(
    parsed: EmailFields,
    existing: Booking,
    action: 'CREATE' | 'MODIFY' | 'CANCEL',
  ): Prisma.BookingUncheckedUpdateInput {
    return buildEmailUpdateData(parsed, existing, action);
  }

  /** True when the departure date moved (both dates known and different). */
  private dateChanged(a?: Date | null, b?: Date | null): boolean {
    if (!a || !b) return false;
    return a.getTime() !== b.getTime();
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
      departureTime: data.departureTime,
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
    const { booking } = await this.upsert(
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
   * Loop the Tours table and return the best name match for a parsed OTA tour
   * name, or null when nothing is confident enough (see TOUR_MATCH_MIN_SCORE).
   * A matching `tourType` nudges the score up so same-type tours win ties.
   */
  private async resolveTourByName(
    rawName: string,
    tourType?: TourType,
  ): Promise<{ id: string; name: string; type: TourType } | null> {
    const target = normalizeTourName(rawName);
    if (!target) return null;

    const tours = await this.prisma.tour.findMany({
      select: { id: true, name: true, type: true },
    });

    let best: { id: string; name: string; type: TourType } | null = null;
    let bestScore = 0;
    for (const tour of tours) {
      const norm = normalizeTourName(tour.name);
      if (!norm) continue;
      let score = tokenOverlap(norm, target);
      if (norm === target) score = 1;
      else if (norm.includes(target) || target.includes(norm))
        score = Math.max(score, 0.85);
      if (tourType && tour.type === tourType) score += 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = { id: tour.id, name: tour.name, type: tour.type };
      }
    }
    return bestScore >= TOUR_MATCH_MIN_SCORE ? best : null;
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
    this.assertBookingContactFields(dto);
    // Guard invalid state: ASSIGNED requires a bus. The bookings-table
    // status dropdown used to allow ASSIGNED with assignmentId=null,
    // which hides the row from both Assignments (no bus) and the
    // PENDING unassigned pool. Force PENDING instead.
    if (dto.status === BookingStatus.ASSIGNED) {
      dto = { ...dto, status: BookingStatus.PENDING };
    }

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
   * Email and pax detail are required for every booking created through the
   * API. Parsed-email bookings go through `upsert()` and are not affected.
   */
  private assertBookingContactFields(dto: CreateBookingDto): void {
    if (!dto.mail?.trim()) {
      throw new BadRequestException('Email is required');
    }
    if (!dto.paxDetail?.trim()) {
      throw new BadRequestException('Pax detail is required');
    }
  }

  async update(id: string, dto: UpdateBookingDto, actor?: AuthenticatedUser) {
    const before = await this.findOne(id);

    // Check if booking is locked due to tour report submission
    if (before.assignmentId) {
      const assignment = await this.prisma.assignment.findUnique({
        where: { id: before.assignmentId },
        include: { tourReport: true },
      });
      const locked =
        assignment?.tourReport?.status === 'SUBMITTED' ||
        assignment?.tourReport?.status === 'VERIFIED';
      if (locked && actor?.role !== RoleType.ADMIN) {
        throw new BadRequestException(
          'This booking is locked because the tour report has been submitted for verification. Only an administrator can change it; accounting can unlock it by rejecting the report.',
        );
      }
    }

    // The override flag is a command, not a booking field.
    const { overrideCancelWindow, ...dtoFields } = dto;

    // A booking can only be cancelled while the tour is still more than
    // CANCEL_WINDOW_HOURS away. Inside the window the operator is already
    // committed, so the cancellation needs an explicit admin override.
    if (
      dto.status === BookingStatus.CANCELED &&
      before.status !== BookingStatus.CANCELED
    ) {
      this.assertCancelAllowed(before, overrideCancelWindow, actor);
    }

    const data: any = { ...dtoFields };

    if (dto.startingDate) data.startingDate = new Date(dto.startingDate);
    // Never persist orphan ASSIGNED: a hand-flipped ASSIGNED without a bus
    // used to hide the row from both tables. Coerce to PENDING and let the
    // assign pipeline (or Reassign) set ASSIGNED together with assignmentId.
    // No throw here — the bookings-table dropdown fires this on every change,
    // throwing broke the manual flow.
    if (data.status === BookingStatus.ASSIGNED && !before.assignmentId) {
      data.status = BookingStatus.PENDING;
    }
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
   * Guard the cancellation window.
   *
   * The tour may only be cancelled while it departs more than
   * CANCEL_WINDOW_HOURS from now — inside the window the vehicle, the guide
   * and the tickets are already committed. An administrator may still cancel
   * (supplier cancellation, no-show, goodwill), but the override is recorded
   * in the audit trail.
   */
  private assertCancelAllowed(
    booking: Booking,
    override: boolean | undefined,
    actor?: AuthenticatedUser,
  ) {
    const deadline = cancelDeadline(booking.startingDate);
    // Unknown departure date → the window cannot be evaluated → allow.
    if (!deadline) return;
    // Still inside the window → nothing to override.
    if (Date.now() <= deadline.getTime()) return;

    // The window is closed.
    if (!override) {
      throw new BadRequestException(
        `Cancellation window closed — ${booking.bookingRef} departs on ${booking.startingDate!.toISOString()} and can only be cancelled more than ${CANCEL_WINDOW_HOURS}h before departure (deadline ${deadline.toISOString()}).`,
      );
    }
    if (actor?.role !== RoleType.ADMIN) {
      throw new ForbiddenException(
        'Only an administrator can cancel a booking inside the cancellation window',
      );
    }
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
      const locked =
        booking.assignment?.tourReport?.status === 'SUBMITTED' ||
        booking.assignment?.tourReport?.status === 'VERIFIED';
      if (locked && actor?.role !== RoleType.ADMIN) {
        throw new BadRequestException(
          `Booking ${booking.bookingRef} is locked because the tour report has been submitted for verification. Only an administrator can change it; accounting can unlock it by rejecting the report.`,
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

  async remove(id: string, actor?: AuthenticatedUser) {
    const booking = await this.findOne(id);
    if (booking.assignmentId) {
      const assignment = await this.prisma.assignment.findUnique({
        where: { id: booking.assignmentId },
        select: { tourReport: { select: { status: true } } },
      });
      const locked =
        assignment?.tourReport?.status === 'SUBMITTED' ||
        assignment?.tourReport?.status === 'VERIFIED';
      if (locked && actor?.role !== RoleType.ADMIN) {
        throw new BadRequestException(
          'This booking is locked because the tour report has been submitted for verification. Only an administrator can delete it; accounting can unlock it by rejecting the report.',
        );
      }
    }
    await this.prisma.booking.delete({ where: { id } });
    await this.auditService.log({
      entityType: 'Booking',
      entityId: id,
      action: 'DELETE',
    });
    return { message: 'Booking deleted' };
  }
}
