import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import {
  AssignBookingsDto,
  CreateAssignmentDto,
  FinalizeAssignmentDto,
  QueryAssignmentDto,
  SubmitTourReportDto,
  UpdateAssignmentDto,
  UpdateAssignmentStatusDto,
  VerifyTourReportDto,
} from './dto/assignment.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import {
  AssignmentOrigin,
  AssignmentStatus,
  BookingStatus,
  FeeFlowType,
  GuideType,
  LeaveStatus,
  NotificationType,
  Prisma,
  RoleType,
} from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { AssignmentBoardService } from '@/queues/assignment-board.service';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { LeavesService } from '@/leaves/leaves.service';
import { STORAGE } from '@/storage';
import type { FileStorage } from '@/storage';

/** Dispatch Board: allows looking back N days. Must match
 *  isOutsideLoadedWindow in frontend/components/dispatch-board/index.tsx. */
const BOARD_LOOKBACK_DAYS = 30;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly board: AssignmentBoardService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
    private readonly leavesService: LeavesService,
    @Inject(STORAGE) private readonly storage: FileStorage,
  ) {}

  private include = {
    bookings: {
      orderBy: { paxSequence: 'asc' as const },
      include: {
        tour: { select: { adultPrice: true } },
        movedFromBus: {
          select: {
            code: true,
            vehicle: { select: { plateNumber: true } },
          },
        },
      },
    },
    vehicle: true,
    provider: true,
    driver: { select: { id: true, name: true, email: true } },
    guide: { select: { id: true, name: true, email: true } },
    reportVerifier: { select: { id: true, name: true, email: true } },
    tourReport: true,
    // Accounting Watermark: the export periods that already contain this trip.
    paymentLines: {
      select: {
        id: true,
        tourDate: true,
        periodId: true,
        payableTo: { select: { id: true, name: true } },
      },
    },
  };

  async findBoard(actor: AuthenticatedUser) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Cap at 90 days ahead to avoid loading months of future data
    const maxDate = new Date(startOfToday);
    maxDate.setDate(maxDate.getDate() + 90);

    // Look back 30 days so completed trips stay visible.
    const minDate = new Date(startOfToday);
    minDate.setDate(minDate.getDate() - BOARD_LOOKBACK_DAYS);

    const where: any = {
      // Do not filter COMPLETED/CANCELED: finished trips must stay visible so past
      // days can be looked up. The frontend filters by the selected date.
      //
      // The board shows trips running / not yet run as of today:
      // - started before today but still running through today (multi-day),
      // - starting today,
      // - or starting within the next 90 days.
      startDate: { lte: maxDate },
      endDate: { gte: minDate },
    };
    // Provider/crew roles only see their own data.
    if (actor.role !== RoleType.ADMIN && actor.role !== RoleType.OFFICE) {
      if (actor.role === RoleType.TRANSPORT_PROVIDER) {
        where.providerId = actor.providerId;
      } else {
        where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
      }
    }

    const items = await this.prisma.assignment.findMany({
      where,
      include: this.include,
      // Stable order: startDate first, then immutable tie-breakers.
      // startDate-only ordering is non-deterministic for same-day buses —
      // Postgres returns equal-startDate rows in arbitrary (physical) order,
      // so any update (edit, submit to accounting) reshuffled top/under.
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 500,
    });

    return items.map((a) => {
      const card = this.decorateBoardCard(a);
      delete card.pickupInfo;
      delete card.pickups;
      delete card.latitude;
      delete card.longitude;
      return card;
    });
  }

  /** List of guides + drivers (User table) so the admin can swap crew on the Dispatch Board.
   *  isBusy = currently on a trip that has not ended as of today → but the
   *  person assigned to that very trip can still be selected.
   *  leaves = the leave periods (PENDING/APPROVED) → frontend colours them differently & blocks selection. */
  async getBoardCrew() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const active = await this.prisma.assignment.findMany({
      where: {
        status: {
          in: [
            AssignmentStatus.PENDING,
            AssignmentStatus.DISPATCHED,
            AssignmentStatus.VERIFYING,
          ],
        },
        startDate: { gte: startOfToday },
      },
      select: { guideId: true, driverId: true },
    });
    const busyGuides = new Set(
      active.map((a) => a.guideId).filter((x): x is string => !!x),
    );
    const busyDrivers = new Set(
      active.map((a) => a.driverId).filter((x): x is string => !!x),
    );

    const leaveMap = await this.fetchLeaveMap();

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [RoleType.TOUR_GUIDE, RoleType.DRIVER] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        guideProfile: { select: { type: true, languages: true, rating: true } },
        driverProfile: { select: { rating: true } },
        provider: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const guides = users
      .filter((u) => u.role === RoleType.TOUR_GUIDE)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        type: u.guideProfile?.type ?? GuideType.FREELANCE,
        languages: u.guideProfile?.languages ?? [],
        rating: u.guideProfile?.rating ?? null,
        isBusy: busyGuides.has(u.id),
        leaves: leaveMap.get(u.id) ?? [],
      }));
    const drivers = users
      .filter((u) => u.role === RoleType.DRIVER)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        rating: u.driverProfile?.rating ?? null,
        provider: u.provider
          ? { id: u.provider.id, name: u.provider.name }
          : null,
        isBusy: busyDrivers.has(u.id),
        leaves: leaveMap.get(u.id) ?? [],
      }));

    return { guides, drivers };
  }

  /** Map userId → list of leaves (PENDING/APPROVED), shared by the crew helpers. */
  private async fetchLeaveMap() {
    const leaves = await this.prisma.userLeave.findMany({
      where: { status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] } },
      select: {
        id: true,
        userId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: { startDate: 'asc' },
    });
    const map = new Map<string, typeof leaves>();
    for (const l of leaves) {
      const arr = map.get(l.userId) ?? [];
      arr.push(l);
      map.set(l.userId, arr);
    }
    return map;
  }

  /** Availability schedule of a guide/driver in the range [from, to] (both ends inclusive). */
  async getCrewAvailability(from: Date, to: Date) {
    // Cap date range to 90 days max
    const maxSpan = new Date(from);
    maxSpan.setDate(maxSpan.getDate() + 90);
    const effectiveTo = to > maxSpan ? maxSpan : to;

    const assignments = await this.prisma.assignment.findMany({
      where: {
        status: { not: AssignmentStatus.CANCELED },
        startDate: { lte: effectiveTo },
        endDate: { gte: from },
        OR: [{ guideId: { not: null } }, { driverId: { not: null } }],
      },
      select: {
        id: true,
        code: true,
        tourName: true,
        status: true,
        startDate: true,
        endDate: true,
        guideId: true,
        driverId: true,
        vehicle: { select: { plateNumber: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const byGuide = new Map<string, typeof assignments>();
    const byDriver = new Map<string, typeof assignments>();
    for (const a of assignments) {
      if (a.guideId) {
        const arr = byGuide.get(a.guideId) ?? [];
        arr.push(a);
        byGuide.set(a.guideId, arr);
      }
      if (a.driverId) {
        const arr = byDriver.get(a.driverId) ?? [];
        arr.push(a);
        byDriver.set(a.driverId, arr);
      }
    }

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [RoleType.TOUR_GUIDE, RoleType.DRIVER] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        guideProfile: { select: { type: true, rating: true } },
        driverProfile: { select: { rating: true } },
        provider: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const toMember = (a: (typeof assignments)[number]) => ({
      id: a.id,
      code: a.code,
      tourName: a.tourName,
      status: a.status,
      startDate: a.startDate,
      endDate: a.endDate,
      plateNumber: a.vehicle?.plateNumber ?? null,
    });

    const leaveMap = await this.fetchLeaveMap();

    const guides = users
      .filter((u) => u.role === RoleType.TOUR_GUIDE)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        type: u.guideProfile?.type ?? GuideType.FREELANCE,
        rating: u.guideProfile?.rating ?? null,
        assignments: (byGuide.get(u.id) ?? []).map(toMember),
        leaves: leaveMap.get(u.id) ?? [],
      }));

    const drivers = users
      .filter((u) => u.role === RoleType.DRIVER)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        rating: u.driverProfile?.rating ?? null,
        provider: u.provider
          ? { id: u.provider.id, name: u.provider.name }
          : null,
        assignments: (byDriver.get(u.id) ?? []).map(toMember),
        leaves: leaveMap.get(u.id) ?? [],
      }));

    return { from, to, guides, drivers };
  }

  /** Dispatches (departs) all PENDING trips that are active TODAY.
   *  Never dispatches future trips (only trips departing today or multi-day
   *  trips still running through today). */
  async dispatchAllBoard(): Promise<{
    dispatched: number;
    skipped: number;
    skippedOnLeave: number;
  }> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    const items = await this.prisma.assignment.findMany({
      where: {
        status: AssignmentStatus.PENDING,
        startDate: { lte: endOfToday },
        endDate: { gte: startOfToday },
      },
      select: { id: true, guideId: true, driverId: true, startDate: true, endDate: true },
    });
    if (items.length === 0)
      return { dispatched: 0, skipped: 0, skippedOnLeave: 0 };

    // Buses without crew cannot depart — they would get stuck at Accounting
    // verification (the guide is the money payee).
    const withCrew = items.filter((a) => a.guideId && a.driverId);
    const skipped = items.length - withCrew.length;

    // Crew on leave on the trip dates cannot depart either.
    const ready: typeof withCrew = [];
    let skippedOnLeave = 0;
    for (const a of withCrew) {
      try {
        await this.assertCrewAvailableForDates(
          a.guideId,
          a.driverId,
          a.startDate,
          a.endDate,
        );
        ready.push(a);
      } catch {
        skippedOnLeave += 1;
      }
    }
    if (ready.length === 0) return { dispatched: 0, skipped, skippedOnLeave };

    const ids = ready.map((a) => a.id);
    await this.prisma.$transaction([
      this.prisma.assignment.updateMany({
        where: { id: { in: ids } },
        data: { status: AssignmentStatus.DISPATCHED },
      }),
      this.prisma.booking.updateMany({
        where: { assignmentId: { in: ids }, status: BookingStatus.PENDING },
        data: { status: BookingStatus.ASSIGNED },
      }),
    ]);

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: ids.join(','),
      action: 'DISPATCH_ALL',
      afterData: { count: ids.length, skipped, skippedOnLeave },
    });
    return { dispatched: ids.length, skipped, skippedOnLeave };
  }

  /** Global auto-assign switch for the Dispatch Board (persisted in SystemSetting). */
  async getBoardMode(): Promise<{ mode: AssignmentOrigin }> {
    const row = await this.prisma.systemSetting.upsert({
      where: { key: 'assignMode' },
      update: {},
      create: { key: 'assignMode', value: AssignmentOrigin.AUTO_ASSIGN },
    });
    return {
      mode:
        row.value === AssignmentOrigin.MANUAL
          ? AssignmentOrigin.MANUAL
          : AssignmentOrigin.AUTO_ASSIGN,
    };
  }

  /** Changes the creation source (Manual/Auto) for all trips currently on the
   *  Dispatch Board AND persists it as the global mode, so the switch and the
   *  trip statuses stay in sync — and new bookings follow the chosen mode.
   *  EXTENSION POINT (auto/manual): add finer modes here as needed, e.g.
   *  per-date or per-tour modes (`assignMode:<tourId>`), without touching callers. */
  async setBoardOrigin(origin: AssignmentOrigin) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [result] = await this.prisma.$transaction([
      this.prisma.assignment.updateMany({
        where: {
          status: { not: AssignmentStatus.CANCELED },
          startDate: { gte: startOfToday },
        },
        data: { origin },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'assignMode' },
        update: { value: origin },
        create: { key: 'assignMode', value: origin },
      }),
    ]);
    this.gateway.notifyAll('board:refresh', { action: 'origin_changed' });
    return { updated: result.count, mode: origin };
  }

  /**
   * Prevents assigning a guide/driver on leave (PENDING/APPROVED) that clashes
   * with the trip schedule — "users with days off will not be put in assignment"
   * (applies to every role).
   */
  private async assertCrewAvailableForDates(
    guideId: string | null | undefined,
    driverId: string | null | undefined,
    startDate: Date,
    endDate: Date,
  ) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    for (const [label, userId] of [
      ['guide', guideId],
      ['driver', driverId],
    ] as const) {
      if (!userId) continue;
      const onLeave = await this.leavesService.hasLeaveConflict(
        userId,
        start,
        end,
      );
      if (onLeave) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        const who = user?.name ?? user?.email ?? userId;
        throw new BadRequestException(
          `${who} is on leave during this date range and cannot be assigned as ${label}.`,
        );
      }
    }
  }

  /** A provider may only create assignments for their own transport provider, vehicles and drivers. */
  private async assertProviderOwnsAssignment(
    actor: AuthenticatedUser,
    dto: {
      providerId?: string | null;
      vehicleId?: string | null;
      driverId?: string | null;
    },
  ) {
    if ((dto.providerId ?? null) !== actor.providerId) {
      throw new ForbiddenException(
        'Cannot create an assignment for another provider',
      );
    }
    if (dto.vehicleId) {
      const v = await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
      });
      if (!v || v.providerId !== actor.providerId) {
        throw new ForbiddenException(
          'Vehicle does not belong to your provider',
        );
      }
    }
    if (dto.driverId) {
      const drv = await this.prisma.user.findUnique({
        where: { id: dto.driverId },
      });
      if (!drv || drv.providerId !== actor.providerId) {
        throw new ForbiddenException('Driver does not belong to your provider');
      }
    }
  }

  /** "Company vehicle = 0 VND" rule: if the assignment uses a vehicle/transport
   *  provider from the Company Fleet (TransportationProvider.isCompany) then the
   *  mandatory vehicle fee = 0 and no price may be entered. */
  private async resolvePriceOverride(dto: {
    providerId?: string | null;
    vehicleId?: string | null;
    priceOverride?: number | null;
  }): Promise<number | null> {
    const provId = dto.providerId ?? null;
    let isCompany = false;
    if (provId) {
      const p = await this.prisma.transportationProvider.findUnique({
        where: { id: provId },
        select: { isCompany: true },
      });
      isCompany = p?.isCompany ?? false;
    } else if (dto.vehicleId) {
      const v = await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
        select: { provider: { select: { isCompany: true } } },
      });
      isCompany = v?.provider?.isCompany ?? false;
    }
    return isCompany ? 0 : (dto.priceOverride ?? null);
  }

  /** Computes the information displayed on the Dispatch Board for one assignment. */
  private decorateBoardCard(a: any) {
    const totalPax =
      a.totalPax ??
      a.bookings.reduce((sum: number, b: any) => sum + (b.totalPax ?? 0), 0);
    const type =
      a.tourType ?? a.bookings.find((b) => b.tourType)?.tourType ?? null;
    const tourName =
      a.tourName ??
      a.bookings.find((b) => b.tourName)?.tourName ??
      a.code ??
      'Tour';
    const durationDays =
      a.durationDays ??
      (a.endDate && a.startDate
        ? Math.max(
            1,
            Math.round(
              (a.endDate.getTime() - a.startDate.getTime()) / 86400000,
            ) + 1,
          )
        : 1);
    const pickups = Array.isArray(a.pickupInfo)
      ? (a.pickupInfo as Array<Record<string, unknown>>)
      : a.bookings
          .filter((b) => b.hotelName || b.address)
          .map((b) => ({
            bookingRef: b.bookingRef,
            customerName: b.customerName,
            pickup: b.hotelName || b.address,
            totalPax: b.totalPax ?? 0,
          }));

    // Lock booking details when tour report is submitted for verification
    // Unlock when rejected by accounting
    const tourReportLocked = a.tourReport
      ? a.tourReport.status === 'SUBMITTED' || a.tourReport.status === 'VERIFIED'
      : false;

    return {
      ...a,
      totalPax,
      tourType: type,
      tourName,
      durationDays,
      pickups,
      tourReport: a.tourReport
        ? { ...a.tourReport, locked: tourReportLocked }
        : null,
    };
  }

  async findAll(
    query: QueryAssignmentDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResult<any>> {
    const { page, limit, status, vehicleId, driverId, guideId, sortOrder } =
      query;
    const where: any = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;
    if (guideId) where.guideId = guideId;
    if (actor.role !== RoleType.ADMIN && actor.role !== RoleType.OFFICE) {
      if (actor.role === RoleType.TRANSPORT_PROVIDER) {
        where.providerId = actor.providerId;
      } else {
        where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        include: this.include,
        orderBy: [{ startDate: sortOrder ?? 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
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

  async create(dto: CreateAssignmentDto, actor?: AuthenticatedUser) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    await this.assertCrewAvailableForDates(
      dto.guideId,
      dto.driverId,
      startDate,
      endDate,
    );
    if (actor?.role === RoleType.TRANSPORT_PROVIDER) {
      await this.assertProviderOwnsAssignment(actor, dto);
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        code: dto.code,
        tourName: dto.tourName,
        startDate,
        endDate,
        vehicleId: dto.vehicleId,
        providerId: dto.providerId,
        driverId: dto.driverId,
        guideId: dto.guideId,
        status: dto.status,
        sequenceIndex: dto.sequenceIndex,
        priceOverride: await this.resolvePriceOverride(dto),
        tripNotes: dto.tripNotes,
        createdWho: actor?.name ?? actor?.email ?? 'System',
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

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : before.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : before.endDate;
    if (dto.guideId !== undefined || dto.driverId !== undefined) {
      await this.assertCrewAvailableForDates(
        dto.guideId !== undefined ? dto.guideId : before.guideId,
        dto.driverId !== undefined ? dto.driverId : before.driverId,
        startDate,
        endDate,
      );
    }

    const assignment = await this.prisma.assignment.update({
      where: { id },
      data: {
        code: dto.code,
        tourName: dto.tourName,
        startDate: dto.startDate ? startDate : undefined,
        endDate: dto.endDate ? endDate : undefined,
        vehicleId: dto.vehicleId,
        providerId: dto.providerId,
        driverId: dto.driverId,
        guideId: dto.guideId,
        status: dto.status,
        sequenceIndex: dto.sequenceIndex,
        priceOverride: await this.resolvePriceOverride({
          providerId:
            dto.providerId !== undefined ? dto.providerId : before.providerId,
          vehicleId:
            dto.vehicleId !== undefined ? dto.vehicleId : before.vehicleId,
          priceOverride: dto.priceOverride,
        }),
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
    this.gateway.notifyAll('board:refresh', { assignmentId: id, action: 'update' });
    return this.findOne(id);
  }

  /** Dispatch is only allowed for trips active TODAY
   *  (departing today or multi-day trips still running through today).
   *  Blocks the admin from dispatching before the departure date — "dispatch only today". */
  private assertDispatchableToday(assignment: any) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);
    const start = new Date(assignment.startDate);
    const end = new Date(assignment.endDate ?? assignment.startDate);
    if (
      start.getTime() > endOfToday.getTime() ||
      end.getTime() < startOfToday.getTime()
    ) {
      const label = `${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()}`;
      throw new BadRequestException(
        `Cannot dispatch "${assignment.code ?? 'Bus'}" (starts ${label}) — only tours active today can be dispatched. Future departures must wait until their tour day.`,
      );
    }
  }

  /** A bus cannot depart without crew — the guide is the money payee and the
   *  driver drives. Without them the trip gets stuck at Accounting verification. */
  private assertCrewAssigned(assignment: any) {
    const missing: string[] = [];
    if (!assignment.guideId) missing.push('tour guide');
    if (!assignment.driverId) missing.push('driver');
    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot dispatch "${assignment.code ?? 'Bus'}" — assign a ${missing.join(' and ')} first.`,
      );
    }
  }

  /** Recall (DISPATCHED → PENDING) is locked after 06:30 on the departure day —
   *  by then the guide may already have seen the assignment.
   *  Before that the backend lets the operator pull a trip back to reassign it. */
  private assertRecallAllowed(assignment: any) {
    const cutoff = new Date(assignment.startDate);
    cutoff.setHours(6, 30, 0, 0);
    if (Date.now() > cutoff.getTime()) {
      throw new BadRequestException(
        `Recall locked — the 06:30 cutoff has passed for "${assignment.code ?? 'Bus'}". The tour is considered departed; cancel it instead if needed.`,
      );
    }
  }

  async updateStatus(id: string, dto: UpdateAssignmentStatusDto) {
    const before = await this.findOne(id);
    if (dto.status === before.status) return before;

    // ── Guard: Dispatch only happens for tours active TODAY ──
    if (dto.status === AssignmentStatus.DISPATCHED) {
      this.assertDispatchableToday(before);
      this.assertCrewAssigned(before);
      // The assigned crew must actually be available on the trip dates
      // (no approved leave) — assignment-time checks can be stale if leave
      // was approved after the crew was picked.
      await this.assertCrewAvailableForDates(
        before.guideId,
        before.driverId,
        before.startDate,
        before.endDate,
      );
    }
    // ── Guard: Recall (DISPATCHED → PENDING) is locked after 06:30 on the
    // departure day — the bus is considered en route. ──
    if (
      before.status === AssignmentStatus.DISPATCHED &&
      dto.status === AssignmentStatus.PENDING
    ) {
      this.assertRecallAllowed(before);
    }

    // ── Guard: COMPLETED requires a verified TourReport AND locked money.
    // (Without the money check, a trip could read COMPLETED while Accounting
    // still has it in the verification queue — an inconsistent state.)
    if (dto.status === AssignmentStatus.COMPLETED) {
      const report = await this.prisma.tourReport.findUnique({
        where: { assignmentId: id },
      });
      if (!report || report.status !== 'VERIFIED') {
        throw new BadRequestException(
          'Cannot mark COMPLETED without a verified tour report. Guide must submit → Admin verifies → Then mark COMPLETED.',
        );
      }
      if (!report.moneyVerifiedAt) {
        throw new BadRequestException(
          'Cannot mark COMPLETED before Accounting locks the money. Verify the money sheet in the Accounting Room first.',
        );
      }
    }

    // Switch the corresponding booking statuses.
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

    // ── Fire notifications + WebSocket ──
    const affectedUserIds = [assignment.driverId, assignment.guideId].filter(
      Boolean,
    ) as string[];
    const notifResult = await this.sendStatusNotifications(
      assignment,
      before.status,
      dto.status,
    );

    this.gateway.broadcastAssignmentChange(id, dto.status, affectedUserIds);

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: `UPDATE_STATUS:${dto.status}`,
      beforeData: { status: before.status },
      afterData: { status: dto.status },
    });
    return this.findOne(id);
  }

  private async sendStatusNotifications(
    assignment: any,
    fromStatus: string,
    toStatus: string,
  ) {
    const code = assignment.code ?? 'Bus';
    const tour = assignment.tourName ?? '';
    const affectedUserIds = [assignment.driverId, assignment.guideId].filter(
      Boolean,
    ) as string[];
    const result: any[] = [];

    for (const userId of affectedUserIds) {
      let type: NotificationType;
      let title: string;
      let body: string;

      switch (toStatus) {
        case AssignmentStatus.DISPATCHED:
          type = NotificationType.ASSIGNED;
          title = `🚌 ${code} departed`;
          body = `Trip ${tour} has started. Please board the bus.`;
          break;
        case AssignmentStatus.TRANSFERRED:
          type = NotificationType.TRANSFERRED;
          title = `🔄 ${code} — Changed`;
          body = `Trip ${tour} has a new bus/seat. Check the new pickup schedule.`;
          break;
        case AssignmentStatus.VERIFYING:
          type = NotificationType.GENERAL;
          title = `⏳ ${code} — Awaiting verification`;
          body = `Trip report for ${tour} has been submitted. Waiting for Admin verification.`;
          break;
        case AssignmentStatus.CANCELED:
          type = NotificationType.CANCELED;
          title = `❌ ${code} — Canceled`;
          body = `Trip ${tour} has been canceled. Passengers were removed from the schedule.`;
          break;
        case AssignmentStatus.COMPLETED:
          type = NotificationType.GENERAL;
          title = `✅ ${code} — Completed`;
          body = `Trip ${tour} has ended.`;
          break;
        case AssignmentStatus.DRAFT_ASSIGNED:
          type = NotificationType.ASSIGNED;
          title = `📋 ${code} — Draft assigned`;
          body = `Trip ${tour} has been assigned a bus. Waiting for confirmation.`;
          break;
        default:
          type = NotificationType.GENERAL;
          title = `${code} — Status updated`;
          body = `Status changed: ${fromStatus} → ${toStatus}`;
      }

      const notif = await this.notificationService.create(
        userId,
        type,
        title,
        body,
        {
          assignmentId: assignment.id,
          fromStatus,
          toStatus,
        },
      );
      result.push(notif);
      this.gateway.notifyUser(userId, 'notification', notif);
    }
    return result;
  }

  async assignBookings(id: string, dto: AssignBookingsDto) {
    const assignment = await this.findOne(id);
    const bookingsToAssign = await this.prisma.booking.findMany({
      where: { id: { in: dto.bookingIds } },
      select: { id: true, assignmentId: true, startingDate: true, tour: { select: { durationDays: true, name: true } } },
    });
    const busy = bookingsToAssign.find((b) => b.assignmentId && b.assignmentId !== id);
    if (busy) {
      throw new BadRequestException(
        `Booking ${busy.id} is already assigned to another assignment`,
      );
    }

    // Validate that all bookings have the same tour
    const tourNames = [...new Set(bookingsToAssign.map((b) => b.tour?.name).filter((n): n is string => !!n))];
    if (tourNames.length > 1) {
      throw new BadRequestException(
        `Cannot assign bookings with different tours to the same assignment. Tours: ${tourNames.join(', ')}`,
      );
    }

    // Validate that all bookings have the same startingDate
    const uniqueStartDates = [...new Set(
      bookingsToAssign.map((b) => b.startingDate?.toISOString().split('T')[0]).filter((d): d is string => !!d)
    )];
    if (uniqueStartDates.length > 1) {
      throw new BadRequestException(
        `Cannot assign bookings with different dates to the same assignment. Dates: ${uniqueStartDates.join(', ')}`,
      );
    }

    const maxSeq = await this.prisma.booking.aggregate({
      where: { assignmentId: id },
      _max: { paxSequence: true },
    });

    await this.prisma.$transaction(
      bookingsToAssign.map((booking, i) =>
        this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            assignmentId: id,
            paxSequence: (maxSeq._max.paxSequence ?? 0) + i + 1,
            status: BookingStatus.ASSIGNED,
          },
        }),
      ),
    );

    // Sync assignment dates and tour name from bookings
    if (uniqueStartDates.length === 1) {
      const startDate = new Date(uniqueStartDates[0]);
      const durationDays = bookingsToAssign[0]?.tour?.durationDays ?? 1;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays - 1);
      await this.prisma.assignment.update({
        where: { id },
        data: { 
          startDate, 
          endDate, 
          durationDays,
          tourName: tourNames[0] ?? assignment.tourName,
        },
      });
    }

    await this.refreshSummary(id);

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'ASSIGN_BOOKINGS',
      afterData: { bookingIds: dto.bookingIds },
    });
    this.gateway.notifyAll('board:refresh', { assignmentId: id, action: 'assign_bookings' });
    return this.findOne(id);
  }

  async removeBooking(id: string, bookingId: string) {
    await this.findOne(id);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || booking.assignmentId !== id) {
      throw new NotFoundException('Booking not in this assignment');
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        assignmentId: null,
        paxSequence: 0,
        status: BookingStatus.PENDING,
      },
    });
    await this.refreshSummary(id);
    this.gateway.notifyAll('board:refresh', { assignmentId: id, action: 'remove_booking' });
    return this.findOne(id);
  }

  // ─── Drag & drop on the Dispatch Board ──────────────────────────────────
  /** Reorders the passengers in a bus following the admin's drag order. */
  async reorderBookings(id: string, bookingIds: string[]) {
    const result = await this.board.reorder(id, bookingIds);
    if (result.error) throw new BadRequestException(result.error);
    this.gateway.notifyAll('board:refresh', { assignmentId: id, action: 'reorder' });
    return this.findOne(id);
  }

  /** Drag-and-drop a booking from this bus to another bus. */
  async moveBooking(
    fromAssignmentId: string,
    bookingId: string,
    toAssignmentId: string,
  ) {
    // Validate that the booking's tour matches the target assignment's tour
    const [booking, toAssignment] = await Promise.all([
      this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { tour: { select: { name: true } } },
      }),
      this.prisma.assignment.findUnique({
        where: { id: toAssignmentId },
        select: { tourName: true },
      }),
    ]);
    
    if (booking?.tour?.name && toAssignment?.tourName && booking.tour.name !== toAssignment.tourName) {
      throw new BadRequestException(
        `Cannot move booking to a bus with a different tour. Booking tour: ${booking.tour.name}, Target bus tour: ${toAssignment.tourName}`,
      );
    }

    const result = await this.board.move(
      fromAssignmentId,
      bookingId,
      toAssignmentId,
    );
    if (result.error) throw new BadRequestException(result.error);
    // Record the origin as evidence: the bus this passenger was moved out of → keep it red on the board.
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { movedFromBusId: fromAssignmentId },
    });
    await this.notifyMoveBooking(fromAssignmentId, toAssignmentId, bookingId);
    this.gateway.notifyAll('board:refresh', { assignmentId: fromAssignmentId, action: 'move_out' });
    this.gateway.notifyAll('board:refresh', { assignmentId: toAssignmentId, action: 'move_in' });
    return this.findOne(toAssignmentId);
  }

  /** Notifies the guides of both ends (departure bus & arrival bus) when a passenger is dragged between 2 buses. */
  private async notifyMoveBooking(
    fromAssignmentId: string,
    toAssignmentId: string,
    bookingId: string,
  ) {
    const [from, to, booking] = await Promise.all([
      this.prisma.assignment.findUnique({
        where: { id: fromAssignmentId },
        select: { code: true, tourName: true, guideId: true },
      }),
      this.prisma.assignment.findUnique({
        where: { id: toAssignmentId },
        select: { code: true, tourName: true, guideId: true },
      }),
      this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { bookingRef: true, customerName: true },
      }),
    ]);
    const guest = `${booking?.customerName ?? 'Passenger'}${booking?.bookingRef ? ` (${booking.bookingRef})` : ''}`;
    const recipients: { id: string | null | undefined; body: string }[] = [
      {
        id: from?.guideId,
        body: `Booking ${guest} has been moved out of your bus ${from?.code ?? ''}.`,
      },
      {
        id: to?.guideId,
        body: `Booking ${guest} has just been moved into your bus ${to?.code ?? ''}. Check the passenger list before departure.`,
      },
    ];
    for (const r of recipients) {
      if (!r.id) continue;
      const notif = await this.notificationService.create(
        r.id,
        NotificationType.TRANSFERRED,
        `🔄 ${to?.code ?? 'Bus'} — Passenger changed`,
        r.body,
        { bookingId, fromAssignmentId, toAssignmentId },
      );
      this.gateway.notifyUser(r.id, 'notification', notif);
    }
  }

  /**
   * Re-aggregates the important assignment information (tourName/tourType/durationDays/
   * pickupInfo) from the current bookings — called after adding/removing a booking.
   */
  private async refreshSummary(assignmentId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { assignmentId },
      include: {
        tour: { select: { durationDays: true, type: true, name: true } },
      },
    });

    // Resolve any missing coordinates from the Coordinate table (by hotelName or address).
    for (const b of bookings) {
      if (b.latitude != null && b.longitude != null) continue;
      const key = b.hotelName ?? b.address;
      if (!key) continue;
      const match = await this.prisma.coordinate.findFirst({
        where: {
          OR: [
            { hotelName: { equals: key, mode: 'insensitive' } },
            { address: { equals: key, mode: 'insensitive' } },
          ],
        },
      });
      if (!match) continue;
      await this.prisma.booking.update({
        where: { id: b.id },
        data: {
          latitude: match.latitude,
          longitude: match.longitude,
          address: b.address ?? match.address,
        },
      });
      b.latitude = match.latitude;
      b.longitude = match.longitude;
    }

    const first = bookings[0];
    const tourName =
      bookings.find((b) => b.tourName)?.tourName ??
      first?.tour?.name ??
      undefined;
    const tourType =
      bookings.find((b) => b.tourType)?.tourType ??
      first?.tour?.type ??
      undefined;
    const durationDays = first?.tour?.durationDays ?? 1;
    const totalPax = bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);

    // Auto-cancel assignment if no active bookings remain
    const activeBookings = bookings.filter((b) => b.status !== BookingStatus.CANCELED);
    if (activeBookings.length === 0 && bookings.length > 0) {
      await this.prisma.assignment.update({
        where: { id: assignmentId },
        data: { status: AssignmentStatus.CANCELED },
      });
      this.gateway.notifyAll('board:refresh', { assignmentId, action: 'auto_cancel' });
      return;
    }

    // Centroid of the pickup points that have coordinates → map centre for the whole trip.
    const geo = bookings.filter(
      (b) => b.latitude != null && b.longitude != null,
    );
    const latitude =
      geo.length > 0
        ? geo.reduce((s, b) => s + b.latitude!, 0) / geo.length
        : null;
    const longitude =
      geo.length > 0
        ? geo.reduce((s, b) => s + b.longitude!, 0) / geo.length
        : null;

    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { tourName, tourType, durationDays, totalPax, latitude, longitude },
    });
  }

  /**
   * Sync assignment dates from its bookings.
   * Uses the most common startingDate among bookings, or the earliest if tied.
   * Recalculates endDate = startDate + durationDays - 1.
   */
  async syncDatesFromBookings(assignmentId: string) {
    const assignment = await this.findOne(assignmentId);
    const bookings = await this.prisma.booking.findMany({
      where: { assignmentId },
      select: { startingDate: true, tour: { select: { durationDays: true } } },
    });
    if (bookings.length === 0) {
      throw new BadRequestException('Assignment has no bookings to sync dates from');
    }
    const dates = bookings
      .map((b) => b.startingDate?.toISOString().split('T')[0])
      .filter((d): d is string => !!d);
    if (dates.length === 0) {
      throw new BadRequestException('No bookings with valid startingDate');
    }
    const counts = dates.reduce((acc, d) => {
      acc[d] = (acc[d] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const maxCount = Math.max(...Object.values(counts));
    const mostCommon = Object.entries(counts)
      .filter(([, c]) => c === maxCount)
      .map(([d]) => d)
      .sort()[0];
    const startDate = new Date(mostCommon);
    const durationDays = assignment.durationDays ?? bookings[0]?.tour?.durationDays ?? 1;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays - 1);
    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { startDate, endDate, durationDays },
    });
    await this.refreshSummary(assignmentId);
    return this.findOne(assignmentId);
  }

  // ─── Tour Report: guide submits the report → accounting verifies → Tour COMPLETED ──

  /**
   * The guide (or OFFICE on their behalf) submits the tour report after the trip ends.
   * The assignment stays DISPATCHED until accounting verifies it.
   */
  async submitTourReport(
    id: string,
    dto: SubmitTourReportDto,
    actor: AuthenticatedUser,
  ) {
    const assignment = await this.findOne(id);
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new BadRequestException('Tour already completed');
    }
    if (assignment.status === AssignmentStatus.CANCELED) {
      throw new BadRequestException(
        'Canceled assignment cannot submit a report',
      );
    }
    if (
      actor.role !== RoleType.ADMIN &&
      actor.role !== RoleType.OFFICE &&
      assignment.guideId !== actor.id
    ) {
      throw new BadRequestException(
        'Only the assigned tour guide or office staff can submit the tour report',
      );
    }

    const latest = await this.prisma.tourReport.findUnique({
      where: { assignmentId: id },
    });

    // A report needs at least one money entry — tell the user to add
    // Collect/Expense lines first instead of submitting an empty sheet.
    const entryCount = await this.prisma.settlement.count({
      where: { assignmentId: id },
    });
    if (entryCount === 0) {
      throw new BadRequestException(
        'Add at least one Collect/Expense entry before submitting the report to Accounting.',
      );
    }

    const report = await this.prisma.tourReport.upsert({
      where: { assignmentId: id },
      update: {
        submittedById: actor.id,
        submittedByName: actor.name,
        submittedAt: new Date(),
        actualPax: dto.actualPax,
        pickupNotes: dto.pickupNotes,
        distanceKm: dto.distanceKm,
        fuelCost: dto.fuelCost,
        tollParking: dto.tollParking,
        notes: dto.notes,
        status: 'SUBMITTED',
        evidenceImages: (dto.evidenceImages ??
          (Array.isArray(latest?.evidenceImages)
            ? latest.evidenceImages
            : [])) as any,
        verifiedById: null,
        verifiedByName: null,
        verifiedAt: null,
        verificationNotes: null,
        // The submitter edits and resubmits -> the trip returns to the Accounting queue.
        moneyRejectedAt: null,
        moneyRejectedById: null,
        moneyRejectedByName: null,
        moneyRejectionReason: null,
      },
      create: {
        assignmentId: id,
        submittedById: actor.id,
        submittedByName: actor.name,
        actualPax: dto.actualPax,
        pickupNotes: dto.pickupNotes,
        distanceKm: dto.distanceKm,
        fuelCost: dto.fuelCost,
        tollParking: dto.tollParking,
        notes: dto.notes,
        status: 'SUBMITTED',
        evidenceImages: (dto.evidenceImages ?? []) as any,
      },
    });

    // After the guide submits → move the trip to VERIFYING to show "awaiting Admin/Accounting verification".
    // (Fake progress: the UI displays the awaiting-verification status.)
    if (assignment.status === AssignmentStatus.DISPATCHED) {
      await this.prisma.assignment.update({
        where: { id },
        data: { status: AssignmentStatus.VERIFYING },
      });
    }

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'SUBMIT_TOUR_REPORT',
      afterData: { reportId: report.id, submittedByName: actor.name },
      changedBy: actor.id,
    });

    return report;
  }

  /**
   * The guide (or OFFICE on their behalf) uploads receipt images for the trip.
   * Images are stored in the guide's folder by tour date: evidence/{guide}_{guideId}/{YYYY-MM-DD}/…
   * Only writes files — the URLs are sent along when submitting the report (evidenceImages).
   */
  async uploadReportImage(
    id: string,
    file: Express.Multer.File,
    actor: AuthenticatedUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    const assignment = await this.findOne(id);
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new BadRequestException('Tour already completed');
    }
    if (assignment.status === AssignmentStatus.CANCELED) {
      throw new BadRequestException(
        'Canceled assignment cannot upload evidence',
      );
    }
    if (
      actor.role !== RoleType.ADMIN &&
      actor.role !== RoleType.OFFICE &&
      assignment.guideId !== actor.id
    ) {
      throw new BadRequestException(
        'Only the assigned tour guide or office staff can upload evidence',
      );
    }

    const guide = (assignment as any).guide;
    const slug = this.userSlug(
      guide?.email,
      guide?.name,
      assignment.guideId ?? 'tourguide',
    );
    const guideDir = `${slug}_${assignment.guideId ?? 'guide'}`;
    const dateKey = assignment.startDate.toISOString().slice(0, 10);
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    const safeName = (file.originalname.split('/').pop() || 'file').replace(
      /[^\w.\- ]/g,
      '_',
    );
    const storageKey = `evidence/${guideDir}/${dateKey}/${Date.now()}-${safeName}`;

    const { url } = await this.storage.save(storageKey, file.buffer, {
      contentType: file.mimetype || undefined,
    });
    const entry = {
      name: safeName,
      url,
      ext,
      uploadedAt: new Date().toISOString(),
      uploadedByName: actor.name ?? actor.email ?? null,
    };

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'UPLOAD_TOUR_REPORT_IMAGE',
      afterData: { url },
      changedBy: actor.id,
    });

    return entry;
  }

  /** Turns a slug/email/name into a safe folder name. */
  private userSlug(
    email?: string | null,
    name?: string | null,
    fallback?: string,
  ) {
    const raw = email?.split('@')[0] || name || fallback || 'user';
    const slug = raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return slug || fallback || 'user';
  }

  /**
   * Admin/Office verifies the tour report content (not the money).
   * This verifies the report data (actualPax, pickupNotes, distanceKm, etc.) is correct.
   * Money verification is separate via Accounting Room.
   * VERIFIED → report status = VERIFIED (content verified).
   * REJECTED → report status = REJECTED (guide needs to resubmit).
   */
  async verifyTourReport(
    id: string,
    dto: VerifyTourReportDto,
    actor: AuthenticatedUser,
  ) {
    if (actor.role !== RoleType.ADMIN && actor.role !== RoleType.OFFICE) {
      throw new BadRequestException(
        'Only management (ADMIN/OFFICE) can verify tour reports',
      );
    }

    const assignment = await this.findOne(id);
    const report = await this.prisma.tourReport.findUnique({
      where: { assignmentId: id },
    });
    if (!report) {
      throw new NotFoundException(
        'No tour report submitted for this assignment',
      );
    }
    if (report.status === 'VERIFIED') {
      throw new BadRequestException('Tour report already verified');
    }

    const updated = await this.prisma.tourReport.update({
      where: { id: report.id },
      data: {
        status: dto.status,
        verifiedById: actor.id,
        verifiedByName: actor.name,
        verifiedAt: new Date(),
        verificationNotes: dto.verificationNotes,
      },
    });

    // Verify on the bus does BOTH steps when possible, so it stays in sync
    // with the verification queue (same trip verified from either place):
    // 1. content verified (above) — always.
    // 2. money locked + trip completed — when the sheet is lockable
    //    (entries exist, guide assigned, not previously returned).
    // Otherwise the trip stays VERIFYING and Accounting finishes the money
    // in the queue.
    if (dto.status === 'VERIFIED' && report.moneyVerifiedAt) {
      // Money was already locked earlier (e.g. from the queue) — just close out.
      await this.prisma.$transaction([
        this.prisma.assignment.update({
          where: { id },
          data: { status: AssignmentStatus.COMPLETED },
        }),
        this.prisma.tourReport.update({
          where: { id: report.id },
          data: {
            finalizedById: actor.id,
            finalizedByName: actor.name,
            finalizedAt: new Date(),
          },
        }),
      ]);
    } else if (
      dto.status === 'VERIFIED' &&
      !report.moneyVerifiedAt &&
      !report.moneyRejectedAt
    ) {
      // Money still open — try to lock it right here so one Verify finishes
      // everything (same rules as the Accounting queue: needs entries + guide).
      const lines = await this.prisma.settlement.findMany({
        where: { assignmentId: id },
        include: { category: { select: { flowType: true } } },
      });
      let collected = 0;
      let paid = 0;
      for (const r of lines) {
        const amount = Number(r.amount);
        if (r.category?.flowType === FeeFlowType.COLLECT_MONEY)
          collected += amount;
        else paid += amount;
      }
      const round2 = (v: number) => Math.round(v * 100) / 100;
      // Guide is still required (the payee), and at least one entry must
      // exist — the UI tells the user to add entries first.
      if (lines.length > 0 && assignment.guideId) {
        const net = round2(collected - paid);
        const flow =
          collected >= paid ? FeeFlowType.COLLECT_MONEY : FeeFlowType.PAY_MONEY;
        const now = new Date();
        await this.prisma.$transaction([
          this.prisma.tourReport.update({
            where: { id: report.id },
            data: {
              settlementFlow: flow,
              netAmount: new Prisma.Decimal(net),
              moneyPayableToId: assignment.guideId,
              moneyVerifiedById: actor.id,
              moneyVerifiedByName: actor.name ?? null,
              moneyVerifiedAt: now,
              moneyVerificationNote: dto.verificationNotes ?? null,
              moneyRejectedAt: null,
              moneyRejectedById: null,
              moneyRejectedByName: null,
              moneyRejectionReason: null,
              finalizedById: actor.id,
              finalizedByName: actor.name,
              finalizedAt: now,
            },
          }),
          this.prisma.assignment.update({
            where: { id },
            data: {
              status: AssignmentStatus.COMPLETED,
              reportVerifierId: actor.id,
            },
          }),
        ]);
        await this.auditService.log({
          entityType: 'TourReport',
          entityId: report.id,
          action: 'VERIFY_MONEY',
          afterData: {
            netAmount: net,
            flow,
            payableToId: assignment.guideId,
            fromBoardVerify: true,
          },
          changedBy: actor.id,
        });
        const payeeName =
          (assignment as any).guide?.name ?? assignment.guideId;
        if (report.submittedById) {
          const notif = await this.notificationService.create(
            report.submittedById,
            NotificationType.MONEY_VERIFIED,
            `✅ Money sheet "${assignment.code}" has been confirmed`,
            `Accounting has checked the money for trip ${assignment.tourName ?? ''} and locked the money for ${payeeName}.`,
            { assignmentId: id },
          );
          this.gateway.notifyUser(report.submittedById, 'notification', notif);
        }
      }
      // else: no entries or no guide yet — stays VERIFYING; add entries /
      // assign crew first, then verify (Accounting can finish in the queue).
    }

    if (dto.status === 'REJECTED') {
      // Rejected → reset the verifier so the guide can resubmit; the bus shows the "Need to verify again" tag.
      await this.prisma.assignment.update({
        where: { id },
        data: { reportVerifierId: null },
      });
    }

    // ── Notify guide about report verification ──
    if (assignment.guideId) {
      const isVerified = dto.status === 'VERIFIED';
      const notifType = isVerified
        ? NotificationType.REPORT_VERIFIED
        : NotificationType.REPORT_REJECTED;
      const title = isVerified
        ? `✅ Report "${assignment.code}" has been confirmed`
        : `❌ Report "${assignment.code}" was rejected`;
      const body = isVerified
        ? `Tour report ${assignment.tourName ?? ''} has been confirmed.`
        : `Tour report ${assignment.tourName ?? ''} was rejected. ${dto.verificationNotes ?? ''}`;
      const notif = await this.notificationService.create(
        assignment.guideId,
        notifType,
        title,
        body,
        {
          assignmentId: id,
          reportStatus: dto.status,
        },
      );
      this.gateway.notifyUser(assignment.guideId, 'notification', notif);
    }

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: `VERIFY_TOUR_REPORT:${dto.status}`,
      beforeData: { reportStatus: report.status },
      afterData: { reportId: updated.id, verifiedByName: actor.name },
      changedBy: actor.id,
    });

    this.gateway.notifyAll('board:refresh', {
      assignmentId: id,
      action: `verify_report_${dto.status}`,
    });
    return this.findOne(id);
  }

  /**
   * Close a trip — "Confirm finished" (legacy endpoint).
   * Now requires tour report to be submitted and money verified.
   * The guide should use PUT /assignments/:id/tour-report instead.
   */
  async finalize(
    id: string,
    dto: FinalizeAssignmentDto,
    actor: AuthenticatedUser,
  ) {
    const assignment = await this.findOne(id);
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new BadRequestException('Tour already completed');
    }
    if (assignment.status === AssignmentStatus.CANCELED) {
      throw new BadRequestException('Canceled assignment cannot be closed');
    }

    const report = await this.prisma.tourReport.findUnique({
      where: { assignmentId: id },
    });

    if (!report) {
      throw new BadRequestException('No tour report submitted for this assignment');
    }
    if (report.status !== 'VERIFIED') {
      throw new BadRequestException(
        'Tour report must be verified by accounting before completing',
      );
    }
    if (!report.moneyVerifiedAt) {
      throw new BadRequestException(
        'Tour money must be verified and locked by accounting before completing',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.assignment.update({
        where: { id },
        data: { status: AssignmentStatus.COMPLETED },
      });
      const existingReport = await tx.tourReport.findUnique({
        where: { assignmentId: id },
        select: { evidenceImages: true },
      });
      const prevEvidence = Array.isArray(existingReport?.evidenceImages)
        ? (existingReport.evidenceImages as unknown as any[])
        : [];
      const mergedEvidence = [...prevEvidence, ...(dto.evidenceImages ?? [])];
      const data = {
        evidenceImages: mergedEvidence as any,
        finalizedById: actor.id,
        finalizedByName: actor.name,
        finalizedAt: new Date(),
      };
      await tx.tourReport.update({
        where: { assignmentId: id },
        data,
      });
    });

    if (assignment.guideId) {
      const notif = await this.notificationService.create(
        assignment.guideId,
        NotificationType.REPORT_VERIFIED,
        `✅ Trip "${assignment.code ?? 'Bus'}" is completed`,
        `${assignment.tourName ?? 'Tour'} — closed by: ${actor.name ?? '—'}`,
        { assignmentId: id },
      );
      this.gateway.notifyUser(assignment.guideId, 'notification', notif);
    }

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'FINALIZE',
      afterData: {
        evidenceCount: dto.evidenceImages?.length ?? 0,
        finalizedByName: actor.name,
      },
      changedBy: actor.id,
    });

    return this.findOne(id);
  }

  // ─── Driver / Guide: my assignments + calendar ─────────────────────────

  /**
   * Return all non-canceled assignments where the current user is driver or guide.
   * Includes bookings, vehicle, provider, tour itinerary for the frontend role views.
   */
  async findMyAssignments(actor: AuthenticatedUser) {
    // Only load 3 months back + upcoming — avoids loading full history
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    cutoff.setHours(0, 0, 0, 0);

    const where: any = {
      status: { not: AssignmentStatus.CANCELED },
      endDate: { gte: cutoff },
    };
    if (actor.role === RoleType.TRANSPORT_PROVIDER) {
      where.providerId = actor.providerId;
    } else {
      where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
    }

    const items = await this.prisma.assignment.findMany({
      where,
      include: {
        bookings: { orderBy: { paxSequence: 'asc' as const } },
        vehicle: true,
        provider: true,
        driver: { select: { id: true, name: true, email: true } },
        guide: { select: { id: true, name: true, email: true } },
        tourReport: true,
      },
      orderBy: [{ startDate: 'asc' }],
      take: 100,
    });

    // Batch-fetch all unique tours to avoid N+1 queries
    const tourIds = [
      ...new Set(
        items
          .map((a) => a.bookings?.[0]?.tourId)
          .filter((id): id is string => !!id),
      ),
    ];
    const tours =
      tourIds.length > 0
        ? await this.prisma.tour.findMany({
            where: { id: { in: tourIds } },
            select: {
              id: true,
              itineraries: {
                orderBy: [
                  { dayNumber: 'asc' as const },
                  { orderIndex: 'asc' as const },
                ],
              },
            },
          })
        : [];
    const tourMap = new Map(tours.map((t) => [t.id, t.itineraries]));

    const enriched = items.map((a) => {
      const firstBooking = a.bookings?.[0];
      const itinerary = firstBooking?.tourId
        ? (tourMap.get(firstBooking.tourId) ?? [])
        : [];
      return this.decorateBoardCard({ ...a, itinerary });
    });

    return enriched;
  }

  /**
   * Calendar view: return a flat list of { date, tourName, assignmentId, status }
   * for the given month so the frontend can render a simple month grid.
   */
  async findMyCalendar(
    actor: AuthenticatedUser,
    year?: number,
    month?: number,
  ) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const where: any = {
      status: { not: AssignmentStatus.CANCELED },
      startDate: { lte: end },
      endDate: { gte: start },
    };
    if (actor.role === RoleType.TRANSPORT_PROVIDER) {
      where.providerId = actor.providerId;
    } else {
      where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
    }
    const items = await this.prisma.assignment.findMany({
      where,
      include: {
        vehicle: { select: { plateNumber: true } },
        driver: { select: { id: true, name: true } },
        guide: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const leaves = await this.prisma.userLeave.findMany({
      where: {
        userId: actor.id,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        reason: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return {
      assignments: items.map((a) => {
        const tourName = a.tourName ?? a.code ?? 'Tour';
        return {
          id: a.id,
          code: a.code,
          tourName,
          status: a.status,
          startDate: a.startDate,
          endDate: a.endDate,
          tourType: a.tourType,
          durationDays: a.durationDays,
          vehiclePlate: a.vehicle?.plateNumber ?? null,
          isDriver: a.driverId === actor.id,
          isGuide: a.guideId === actor.id,
        };
      }),
      leaves: leaves.map((l) => ({
        id: l.id,
        startDate: l.startDate,
        endDate: l.endDate,
        status: l.status,
        reason: l.reason,
      })),
    };
  }

  async findMyFleet(
    actor: AuthenticatedUser,
    startDate?: string,
    endDate?: string,
  ) {
    if (!actor.providerId) {
      return { providerId: null, items: [] };
    }
    const where: any = {
      providerId: actor.providerId,
      status: { not: AssignmentStatus.CANCELED },
    };
    if (startDate) where.startDate = { gte: new Date(startDate) };
    if (endDate) where.endDate = { lte: new Date(endDate + 'T23:59:59.999') };

    const items = await this.prisma.assignment.findMany({
      where,
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, capacity: true, brand: true },
        },
        driver: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true } },
        tourReport: { select: { id: true, status: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return {
      providerId: actor.providerId,
      items: items.map((a) => ({
        id: a.id,
        code: a.code,
        tourName: a.tourName,
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate,
        totalPax: a.totalPax,
        tourType: a.tourType,
        vehicle: a.vehicle,
        driver: a.driver,
        tourReport: a.tourReport,
      })),
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.booking.updateMany({
      where: { assignmentId: id },
      data: {
        assignmentId: null,
        paxSequence: 0,
        status: BookingStatus.PENDING,
      },
    });
    await this.prisma.assignment.delete({ where: { id } });
    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'DELETE',
    });
    return { message: 'Assignment deleted' };
  }
}
