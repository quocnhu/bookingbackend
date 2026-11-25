import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AssignmentExecutionMode,
  AssignmentStatus,
  GuideType,
  NotificationType,
  Prisma,
  ProviderAssignmentMode,
  RoleType,
  TransportRequestStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { LeavesService } from '@/leaves/leaves.service';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { AutoCrewService } from '@/queues/auto-crew.service';
import { MailService } from '@/mail/mail.service';
import { DispatchPolicyService } from '@/dispatch-policy/dispatch-policy.service';
import { GuideConfirmationService } from '@/guide-confirmation/guide-confirmation.service';
import { isUnpaidPayPalBooking } from '@/common/utils/unpaid-booking.util';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import {
  AssignTransportRequestDto,
  CancelTransportRequestDto,
  DeclineTransportRequestDto,
  OverrideTransportRequestDto,
  QueryTransportRequestDto,
  SendTransportRequestDto,
  UpdateProviderAssignmentModeDto,
  UpdateTransportRequestSettingsDto,
} from './dto/transport-request.dto';

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HCM_OFFSET_MINUTES = 7 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const WORKLOAD_WINDOW_DAYS = 30;

const SETTING_KEYS = {
  enabled: 'transportRequestEnabled',
  sendDaysBefore: 'transportRequestSendDaysBefore',
  sendTime: 'transportRequestSendTime',
  deadlineTime: 'transportRequestDeadlineTime',
  minLeadHours: 'transportRequestMinLeadHours',
};

const DEFAULT_SETTINGS = {
  enabled: true,
  sendDaysBefore: 2,
  sendTime: '08:00',
  deadlineTime: '21:00',
  minLeadHours: 3,
};

const RECALL_CUTOFF_KEY = 'recallCutoffTime';
const DEFAULT_RECALL_CUTOFF = '06:00';

type TransportSettings = typeof DEFAULT_SETTINGS;

const assignmentInclude = {
  bookings: {
    orderBy: { paxSequence: 'asc' as const },
    include: {
      tour: {
        select: { id: true, code: true, name: true, durationDays: true },
      },
    },
  },
  vehicle: {
    select: { id: true, plateNumber: true, capacity: true, brand: true },
  },
  provider: {
    select: { id: true, name: true, isCompany: true, assignmentMode: true },
  },
  driver: { select: { id: true, name: true, email: true, providerId: true } },
  guide: {
    select: {
      id: true,
      name: true,
      email: true,
      guideProfile: { select: { type: true } },
    },
  },
} satisfies Prisma.AssignmentInclude;

type AssignmentView = Prisma.AssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

@Injectable()
export class TransportRequestsService {
  private readonly logger = new Logger(TransportRequestsService.name);
  private runningScheduledTick = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly leaves: LeavesService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
    private readonly autoCrew: AutoCrewService,
    private readonly mail: MailService,
    private readonly dispatchPolicy: DispatchPolicyService,
    private readonly guideConfirmation: GuideConfirmationService,
  ) {}

  private include = assignmentInclude;

  async list(query: QueryTransportRequestDto, actor: AuthenticatedUser) {
    const where: Prisma.AssignmentWhereInput = {
      executionMode: { not: AssignmentExecutionMode.OUTSOURCED_PARTNER },
      status: { not: AssignmentStatus.CANCELED },
      endDate: { gte: this.daysAgo(30) },
    };
    const and: Prisma.AssignmentWhereInput[] = [];

    if (this.isProvider(actor)) {
      if (!actor.providerId) {
        throw new ForbiddenException(
          'Your account is not linked to a transportation provider',
        );
      }
      where.providerId = actor.providerId;
      and.push({
        providerRequestStatus: {
          in: [
            TransportRequestStatus.REQUESTED,
            TransportRequestStatus.VIEWED,
            TransportRequestStatus.ASSIGNED,
            TransportRequestStatus.DECLINED,
            TransportRequestStatus.EXPIRED,
          ],
        },
      });
    } else if (this.isAdminOrOffice(actor)) {
      if (query.status) where.providerRequestStatus = query.status;
      if (query.providerId) where.providerId = query.providerId;
    } else {
      throw new ForbiddenException(
        'Only Admin, Office or Transport Provider can view transport requests',
      );
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      and.push({
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { tourName: { contains: search, mode: 'insensitive' } },
          { provider: { name: { contains: search, mode: 'insensitive' } } },
          { driver: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
    if (query.from) and.push({ startDate: { gte: new Date(query.from) } });
    if (query.to)
      and.push({ startDate: { lte: new Date(`${query.to}T23:59:59.999`) } });
    if (and.length) where.AND = and;

    const items = await this.prisma.assignment.findMany({
      where,
      include: this.include,
      orderBy: [{ startDate: 'asc' }, { providerDeadline: 'asc' }],
      take: 500,
    });
    return items.map((item) => this.toView(item));
  }

  async getCandidates(assignmentId: string, actor: AuthenticatedUser) {
    const assignment = await this.loadAssignment(assignmentId);
    this.assertProviderAccess(actor, assignment);
    return this.buildCandidates(assignment);
  }

  private async buildCandidates(assignment: AssignmentView) {
    const providerId = assignment.providerId;
    if (!providerId) {
      throw new BadRequestException(
        'This assignment has no transportation provider',
      );
    }

    const start = this.startOfDay(assignment.startDate);
    const end = this.endOfDay(assignment.endDate);
    const windowStart = this.daysAgo(WORKLOAD_WINDOW_DAYS);
    const windowEnd = this.daysAhead(WORKLOAD_WINDOW_DAYS);

    const drivers = await this.prisma.user.findMany({
      where: {
        role: RoleType.DRIVER,
        isActive: true,
        providerId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        driverProfile: { select: { rating: true, licenseNumber: true } },
      },
      orderBy: { name: 'asc' },
    });
    const driverIds = drivers.map((d) => d.id);
    const [busyDrivers, workload, leaves] = await Promise.all([
      this.busyDriverIds(driverIds, start, end, assignment.id),
      this.driverWorkload(driverIds, windowStart, windowEnd, assignment.id),
      this.leaveMap(driverIds, start, end),
    ]);

    const driverRows = drivers.map((driver) => {
      const busy = busyDrivers.has(driver.id);
      const onLeave = leaves.has(driver.id);
      const load = workload.get(driver.id) ?? { days: 0, trips: 0 };
      return {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        licenseNumber: driver.driverProfile?.licenseNumber ?? null,
        rating: driver.driverProfile?.rating ?? 0,
        workloadDays: load.days,
        workloadTrips: load.trips,
        available: !busy && !onLeave,
        busy,
        onLeave,
      };
    });
    driverRows.sort(
      (a, b) =>
        Number(b.available) - Number(a.available) ||
        a.workloadDays - b.workloadDays ||
        a.workloadTrips - b.workloadTrips ||
        b.rating - a.rating ||
        (a.name ?? '').localeCompare(b.name ?? ''),
    );

    const vehicles = await this.prisma.vehicle.findMany({
      where: { providerId },
      select: { id: true, plateNumber: true, capacity: true, brand: true },
      orderBy: [{ capacity: 'asc' }, { plateNumber: 'asc' }],
    });
    const busyVehicles = await this.busyVehicleIds(
      vehicles.map((v) => v.id),
      start,
      end,
      assignment.id,
    );
    const vehicleRows = vehicles
      .map((vehicle) => ({
        ...vehicle,
        available:
          !busyVehicles.has(vehicle.id) &&
          (!assignment.totalPax ||
            (vehicle.capacity ?? 0) >= assignment.totalPax),
        busy: busyVehicles.has(vehicle.id),
      }))
      .sort(
        (a, b) =>
          Number(b.available) - Number(a.available) ||
          (a.capacity ?? 0) - (b.capacity ?? 0) ||
          a.plateNumber.localeCompare(b.plateNumber),
      );

    return {
      assignmentId: assignment.id,
      providerId,
      workloadWindow: {
        from: windowStart,
        to: windowEnd,
        days: WORKLOAD_WINDOW_DAYS,
      },
      drivers: driverRows,
      vehicles: vehicleRows,
      recommendedDriverId: driverRows.find((d) => d.available)?.id ?? null,
      recommendedVehicleId: vehicleRows.find((v) => v.available)?.id ?? null,
    };
  }

  /** The system's suggested driver + vehicle for this provider (the travel
   *  agent's pick). The provider can accept it or swap to another candidate. */
  private async suggestionText(assignment: AssignmentView) {
    try {
      const candidates = await this.buildCandidates(assignment);
      const driver = candidates.drivers.find(
        (d) => d.id === candidates.recommendedDriverId,
      );
      const vehicle = candidates.vehicles.find(
        (v) => v.id === candidates.recommendedVehicleId,
      );
      if (!driver) return 'No available driver found — please assign manually.';
      return `Suggested driver: ${driver.name ?? driver.email ?? driver.id}${
        vehicle?.plateNumber ? ` · vehicle ${vehicle.plateNumber}` : ''
      }. Accept or change this before the deadline.`;
    } catch {
      return 'Open the request to choose a driver and vehicle.';
    }
  }

  async send(
    assignmentId: string,
    dto: SendTransportRequestDto,
    actor: AuthenticatedUser,
  ) {
    this.assertAdminOrOffice(actor);
    const assignment = await this.loadAssignment(assignmentId);
    this.assertRequestable(assignment);

    const providerId = dto.providerId ?? assignment.providerId;
    if (!providerId) {
      throw new BadRequestException(
        'Select a transportation provider before sending the request',
      );
    }
    const provider = await this.prisma.transportationProvider.findUnique({
      where: { id: providerId },
    });
    if (!provider)
      throw new NotFoundException('Transportation provider not found');

    const settings = await this.getSettings();
    let deadline = dto.deadline
      ? new Date(dto.deadline)
      : this.computeDeadline(assignment.startDate, settings);
    if (Number.isNaN(deadline.getTime())) {
      throw new BadRequestException('Invalid deadline');
    }
    if (deadline.getTime() <= Date.now()) {
      // Manual send after the standard 21:00 deadline (e.g. the first provider
      // failed): give the replacement a short window up to departure.
      const now = Date.now();
      const tripStart = new Date(assignment.startDate).getTime();
      const leadMs = Math.max(1, settings.minLeadHours) * 60 * 60 * 1000;
      const fallback = Math.min(now + leadMs, tripStart);
      deadline = new Date(fallback > now ? fallback : now + 60 * 60 * 1000);
      if (deadline.getTime() <= now) {
        throw new BadRequestException(
          'The trip already departed — a new provider request cannot be sent.',
        );
      }
    }

    const previousProviderId = assignment.providerId;
    const updated = await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        providerId,
        providerRequestStatus: TransportRequestStatus.REQUESTED,
        providerRequestedAt: new Date(),
        providerRequestedById: actor.id,
        providerDeadline: deadline,
        providerWarningAt: null,
        providerRequestNote: dto.note ?? null,
        providerViewedAt: null,
        providerRespondedAt: null,
        providerResponseNote: null,
        providerDeclineReason: null,
        providerAssignedById: null,
        driverId: null,
        vehicleId: null,
      },
      include: this.include,
    });

    await this.audit.log({
      entityType: 'Assignment',
      entityId: assignment.id,
      action: 'TRANSPORT_REQUEST_SEND',
      beforeData: {
        providerId: assignment.providerId,
        status: assignment.providerRequestStatus,
      },
      afterData: { providerId, deadline, note: dto.note ?? null },
      changedBy: actor.id,
    });

    if (
      previousProviderId &&
      previousProviderId !== providerId &&
      (
        [
          TransportRequestStatus.REQUESTED,
          TransportRequestStatus.VIEWED,
          TransportRequestStatus.ASSIGNED,
          TransportRequestStatus.EXPIRED,
        ] as TransportRequestStatus[]
      ).includes(assignment.providerRequestStatus)
    ) {
      await this.notifyProvider(
        previousProviderId,
        'Route assigned to another provider',
        `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} is no longer available to you — the travel agent assigned it to another provider.`,
        {
          kind: 'TRANSPORT_REASSIGNED',
          assignmentId: updated.id,
          status: TransportRequestStatus.CANCELLED,
          url: '/transport-provider/requests',
        },
      );
      await this.sendProviderEmail(previousProviderId, {
        title: 'Route no longer available',
        message: `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} was reassigned by the travel agent and is no longer available to you.`,
        reference: updated.code ?? updated.id,
      });
    }
    const suggestion = await this.suggestionText(updated);
    await this.notifyProvider(
      providerId,
      'New transport request',
      `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} · ${updated.totalPax} pax. ${suggestion} Deadline ${this.formatDateTime(deadline)}.`,
      {
        kind: 'TRANSPORT_REQUESTED',
        assignmentId: updated.id,
        status: updated.providerRequestStatus,
        url: '/transport-provider/requests',
      },
    );
    await this.sendProviderEmail(providerId, {
      title: 'New transport request',
      message: `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} · ${updated.totalPax} pax. ${suggestion} Deadline ${this.formatDateTime(deadline)}. Log in to assign a driver and vehicle or decline.`,
      reference: updated.code ?? updated.id,
    });
    this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
    return this.toView(updated);
  }

  async cancel(
    assignmentId: string,
    dto: CancelTransportRequestDto,
    actor: AuthenticatedUser,
  ) {
    this.assertAdminOrOffice(actor);
    const assignment = await this.loadAssignment(assignmentId);
    const updated = await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        providerRequestStatus: TransportRequestStatus.CANCELLED,
        providerRespondedAt: new Date(),
        providerResponseNote: dto.note ?? null,
      },
      include: this.include,
    });
    await this.audit.log({
      entityType: 'Assignment',
      entityId: assignment.id,
      action: 'TRANSPORT_REQUEST_CANCEL',
      beforeData: { status: assignment.providerRequestStatus },
      afterData: { status: updated.providerRequestStatus },
      changedBy: actor.id,
    });
    if (assignment.providerId) {
      await this.notifyProvider(
        assignment.providerId,
        'Transport request cancelled',
        `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} was cancelled.`,
        {
          kind: 'TRANSPORT_CANCELLED',
          assignmentId: updated.id,
          status: updated.providerRequestStatus,
          url: '/transport-provider/requests',
        },
      );
      await this.sendProviderEmail(assignment.providerId, {
        title: 'Transport request cancelled',
        message: `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} was cancelled by the travel agent.`,
        reference: updated.code ?? updated.id,
      });
    }
    this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
    return this.toView(updated);
  }

  async override(
    assignmentId: string,
    dto: OverrideTransportRequestDto,
    actor: AuthenticatedUser,
  ) {
    this.assertAdminOrOffice(actor);
    const assignment = await this.loadAssignment(assignmentId);
    this.assertRequestable(assignment);

    const previousProviderId = assignment.providerId;
    const providerId = dto.providerId ?? assignment.providerId;
    if (!providerId) {
      throw new BadRequestException('Select a transportation provider first');
    }
    await this.applyAssignment(assignment, {
      providerId,
      driverId: dto.driverId,
      vehicleId: dto.vehicleId,
      note: dto.note,
      actor,
      source: 'ADMIN_OVERRIDE',
    });
    if (previousProviderId && previousProviderId !== providerId) {
      await this.notifyProvider(
        previousProviderId,
        'Route assigned to another provider',
        `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} is no longer available to you — the travel agent assigned it to another provider.`,
        {
          kind: 'TRANSPORT_REASSIGNED',
          assignmentId: assignment.id,
          status: TransportRequestStatus.CANCELLED,
          url: '/transport-provider/requests',
        },
      );
      await this.sendProviderEmail(previousProviderId, {
        title: 'Route no longer available',
        message: `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} was reassigned by the travel agent and is no longer available to you.`,
        reference: assignment.code ?? assignment.id,
      });
    }
    const updated = await this.loadAssignment(assignmentId);
    await this.notifyProvider(
      providerId,
      'Driver & vehicle assigned',
      `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} was assigned by the travel agent.`,
      {
        kind: 'TRANSPORT_ASSIGNED',
        assignmentId: updated.id,
        status: updated.providerRequestStatus,
        url: '/transport-provider/requests',
      },
    );
    await this.sendProviderEmail(providerId, {
      title: 'Transport request assigned',
      message: `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} was assigned by the travel agent. Log in to review the driver, vehicle and route.`,
      reference: updated.code ?? updated.id,
    });
    this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
    return this.toView(updated);
  }

  async markViewed(assignmentId: string, actor: AuthenticatedUser) {
    const assignment = await this.loadAssignment(assignmentId);
    this.assertProviderAccess(actor, assignment);
    if (assignment.providerRequestStatus !== TransportRequestStatus.REQUESTED) {
      return this.toView(assignment);
    }
    const updated = await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        providerRequestStatus: TransportRequestStatus.VIEWED,
        providerViewedAt: new Date(),
      },
      include: this.include,
    });
    this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
    return this.toView(updated);
  }

  async assign(
    assignmentId: string,
    dto: AssignTransportRequestDto,
    actor: AuthenticatedUser,
  ) {
    const assignment = await this.loadAssignment(assignmentId);
    this.assertProviderAccess(actor, assignment);
    this.assertProviderCanRespond(assignment);

    await this.applyAssignment(assignment, {
      providerId: assignment.providerId!,
      driverId: dto.driverId,
      vehicleId: dto.vehicleId,
      note: dto.note,
      actor,
      source: 'PROVIDER_MANUAL',
    });
    const updated = await this.loadAssignment(assignmentId);
    await this.notifyAdmins(
      'Transport request assigned',
      `${updated.provider?.name ?? 'Provider'} assigned ${updated.driver?.name ?? 'a driver'} for ${updated.tourName ?? updated.code ?? 'tour'} · ${this.formatDateTime(updated.startDate)}.`,
      {
        kind: 'TRANSPORT_ASSIGNED',
        assignmentId: updated.id,
        status: updated.providerRequestStatus,
        url: '/service/transport-requests',
      },
    );
    this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
    return this.toView(updated);
  }

  async autoAssign(assignmentId: string, actor: AuthenticatedUser) {
    const assignment = await this.loadAssignment(assignmentId);
    this.assertProviderAccess(actor, assignment);
    this.assertProviderCanRespond(assignment);

    const candidates = await this.getCandidates(assignmentId, actor);
    const driverId = candidates.recommendedDriverId;
    const vehicleId = candidates.recommendedVehicleId;
    if (!driverId) {
      throw new BadRequestException('No available driver found for this trip');
    }
    if (!vehicleId) {
      throw new BadRequestException('No available vehicle found for this trip');
    }

    await this.applyAssignment(assignment, {
      providerId: assignment.providerId!,
      driverId,
      vehicleId,
      note: 'Automatically assigned by the provider portal',
      actor,
      source: 'PROVIDER_AUTO',
    });
    const updated = await this.loadAssignment(assignmentId);
    await this.notifyAdmins(
      'Transport request auto-assigned',
      `${updated.provider?.name ?? 'Provider'} auto-assigned ${updated.driver?.name ?? 'a driver'} for ${updated.tourName ?? updated.code ?? 'tour'} · ${this.formatDateTime(updated.startDate)}.`,
      {
        kind: 'TRANSPORT_ASSIGNED',
        assignmentId: updated.id,
        status: updated.providerRequestStatus,
        url: '/service/transport-requests',
      },
    );
    this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
    return this.toView(updated);
  }

  async decline(
    assignmentId: string,
    dto: DeclineTransportRequestDto,
    actor: AuthenticatedUser,
  ) {
    const assignment = await this.loadAssignment(assignmentId);
    this.assertProviderAccess(actor, assignment);
    this.assertProviderCanRespond(assignment);

    const updated = await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        providerRequestStatus: TransportRequestStatus.DECLINED,
        providerRespondedAt: new Date(),
        providerDeclineReason: dto.reason,
      },
      include: this.include,
    });
    await this.audit.log({
      entityType: 'Assignment',
      entityId: assignment.id,
      action: 'TRANSPORT_REQUEST_DECLINE',
      beforeData: { status: assignment.providerRequestStatus },
      afterData: { status: updated.providerRequestStatus, reason: dto.reason },
      changedBy: actor.id,
    });
    await this.notifyAdmins(
      'Transport request declined',
      `${updated.provider?.name ?? 'Provider'} declined ${updated.tourName ?? updated.code ?? 'tour'} · ${this.formatDateTime(updated.startDate)}: ${dto.reason}`,
      {
        kind: 'TRANSPORT_DECLINED',
        assignmentId: updated.id,
        status: updated.providerRequestStatus,
        url: '/service/transport-requests',
      },
    );
    this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
    return this.toView(updated);
  }

  async getProviderSettings(actor: AuthenticatedUser, providerId?: string) {
    const targetId = this.resolveProviderId(actor, providerId);
    const provider = await this.prisma.transportationProvider.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, assignmentMode: true },
    });
    if (!provider)
      throw new NotFoundException('Transportation provider not found');
    return provider;
  }

  /**
   * Driver workload for the provider's own fleet: tour-days and trip counts in
   * the rolling ±30-day window, plus today's availability. Powers the
   * "Driver workload" sidebar on the provider transport-requests page.
   */
  async getDriverWorkload(
    actor: AuthenticatedUser,
    providerId?: string,
  ) {
    const targetId = this.resolveProviderId(actor, providerId);
    const windowStart = this.daysAgo(WORKLOAD_WINDOW_DAYS);
    const windowEnd = this.daysAhead(WORKLOAD_WINDOW_DAYS);
    const todayStart = this.startOfDay(new Date());
    const todayEnd = this.endOfDay(new Date());

    const drivers = await this.prisma.user.findMany({
      where: { role: RoleType.DRIVER, isActive: true, providerId: targetId },
      select: {
        id: true,
        name: true,
        email: true,
        driverProfile: { select: { rating: true, licenseNumber: true } },
      },
      orderBy: { name: 'asc' },
    });
    const driverIds = drivers.map((d) => d.id);
    const [workload, busyToday, leaveToday] = await Promise.all([
      this.driverWorkload(driverIds, windowStart, windowEnd, ''),
      this.busyDriverIds(driverIds, todayStart, todayEnd, ''),
      this.leaveMap(driverIds, todayStart, todayEnd),
    ]);

    const rows = drivers
      .map((driver) => {
        const load = workload.get(driver.id) ?? { days: 0, trips: 0 };
        const busy = busyToday.has(driver.id);
        const onLeave = leaveToday.has(driver.id);
        return {
          id: driver.id,
          name: driver.name,
          email: driver.email,
          licenseNumber: driver.driverProfile?.licenseNumber ?? null,
          rating: driver.driverProfile?.rating ?? 0,
          workloadDays: load.days,
          workloadTrips: load.trips,
          busyToday: busy,
          onLeaveToday: onLeave,
          availableToday: !busy && !onLeave,
        };
      })
      .sort(
        (a, b) =>
          a.workloadDays - b.workloadDays ||
          a.workloadTrips - b.workloadTrips ||
          b.rating - a.rating ||
          (a.name ?? '').localeCompare(b.name ?? ''),
      );

    return {
      providerId: targetId,
      workloadWindow: {
        from: windowStart,
        to: windowEnd,
        days: WORKLOAD_WINDOW_DAYS,
      },
      drivers: rows,
    };
  }

  async updateProviderSettings(
    dto: UpdateProviderAssignmentModeDto,
    actor: AuthenticatedUser,
  ) {
    const targetId = this.resolveProviderId(actor, dto.providerId);
    const provider = await this.prisma.transportationProvider.update({
      where: { id: targetId },
      data: { assignmentMode: dto.assignmentMode },
      select: { id: true, name: true, assignmentMode: true },
    });
    await this.audit.log({
      entityType: 'TransportationProvider',
      entityId: targetId,
      action: 'UPDATE_ASSIGNMENT_MODE',
      afterData: { assignmentMode: dto.assignmentMode },
      changedBy: actor.id,
    });
    return provider;
  }

  async getSettings(): Promise<TransportSettings> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: Object.values(SETTING_KEYS) } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const sendTime = map.get(SETTING_KEYS.sendTime);
    const deadlineTime = map.get(SETTING_KEYS.deadlineTime);
    return {
      enabled: (map.get(SETTING_KEYS.enabled) ?? 'true') !== 'false',
      sendDaysBefore: this.intSetting(
        map.get(SETTING_KEYS.sendDaysBefore),
        DEFAULT_SETTINGS.sendDaysBefore,
        0,
        30,
      ),
      sendTime:
        sendTime && HHMM_PATTERN.test(sendTime)
          ? sendTime
          : DEFAULT_SETTINGS.sendTime,
      deadlineTime:
        deadlineTime && HHMM_PATTERN.test(deadlineTime)
          ? deadlineTime
          : DEFAULT_SETTINGS.deadlineTime,
      minLeadHours: this.intSetting(
        map.get(SETTING_KEYS.minLeadHours),
        DEFAULT_SETTINGS.minLeadHours,
        0,
        72,
      ),
    };
  }

  async updateSettings(
    dto: UpdateTransportRequestSettingsDto,
    actor: AuthenticatedUser,
  ) {
    this.assertAdminOrOffice(actor);
    const current = await this.getSettings();
    const next: TransportSettings = {
      enabled: dto.enabled ?? current.enabled,
      sendDaysBefore: dto.sendDaysBefore ?? current.sendDaysBefore,
      sendTime: dto.sendTime ?? current.sendTime,
      deadlineTime: dto.deadlineTime ?? current.deadlineTime,
      minLeadHours: dto.minLeadHours ?? current.minLeadHours,
    };
    if (
      !HHMM_PATTERN.test(next.sendTime) ||
      !HHMM_PATTERN.test(next.deadlineTime)
    ) {
      throw new BadRequestException('Times must use HH:mm');
    }
    const entries: Array<[string, string]> = [
      [SETTING_KEYS.enabled, String(next.enabled)],
      [SETTING_KEYS.sendDaysBefore, String(next.sendDaysBefore)],
      [SETTING_KEYS.sendTime, next.sendTime],
      [SETTING_KEYS.deadlineTime, next.deadlineTime],
      [SETTING_KEYS.minLeadHours, String(next.minLeadHours)],
    ];
    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );
    await this.audit.log({
      entityType: 'SystemSetting',
      entityId: 'transportRequestSettings',
      action: 'UPDATE_TRANSPORT_REQUEST_SETTINGS',
      beforeData: current,
      afterData: next,
      changedBy: actor.id,
    });
    return next;
  }

  @Cron('*/10 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async scheduledTick() {
    if (this.runningScheduledTick) return;
    this.runningScheduledTick = true;
    try {
      await this.processDueRequests();
    } catch (error) {
      this.logger.error(
        `Transport request scheduler failed: ${(error as Error).message}`,
      );
    } finally {
      this.runningScheduledTick = false;
    }
  }

  async processDueRequests() {
    const settings = await this.getSettings();
    if (!settings.enabled)
      return { sent: 0, expired: 0, autoAssigned: 0, warned: 0 };

    const now = new Date();
    const horizon = this.daysAhead(settings.sendDaysBefore + 1);
    const assignments = await this.prisma.assignment.findMany({
      where: {
        status: {
          in: [AssignmentStatus.DRAFT_ASSIGNED, AssignmentStatus.PENDING],
        },
        executionMode: { not: AssignmentExecutionMode.OUTSOURCED_PARTNER },
        startDate: { gt: now, lte: horizon },
        OR: [{ driverId: null }, { vehicleId: null }],
        providerRequestStatus: {
          in: [
            TransportRequestStatus.NOT_REQUIRED,
            TransportRequestStatus.REQUESTED,
            TransportRequestStatus.VIEWED,
          ],
        },
      },
      include: this.include,
      orderBy: { startDate: 'asc' },
      take: 200,
    });

    let sent = 0;
    let expired = 0;
    let autoAssigned = 0;
    let warned = 0;

    for (const assignment of assignments) {
      let current = assignment;

      // Company fleet first: give auto-crew a chance to bind a company driver.
      // If none exists, reserve ONE external provider for this bus (each
      // external provider carries at most one bus per departure date).
      if (!current.providerId || current.provider?.isCompany) {
        if (current.driverId) continue;
        let companyDriverAssigned = false;
        try {
          const crew = await this.autoCrew.assignCrewForBus(current.id);
          companyDriverAssigned = !!crew.updates?.driverId;
        } catch (error) {
          this.logger.warn(
            `Auto-crew fallback failed for ${current.code ?? current.id}: ${(error as Error).message}`,
          );
        }
        if (companyDriverAssigned) continue;

        // After the deadline, do not reserve a fresh provider for a request
        // that can no longer be answered — alert the admin instead.
        const preliminaryDeadline = this.computeDeadline(
          current.startDate,
          settings,
        );
        if (now.getTime() >= preliminaryDeadline.getTime()) {
          await this.warnNoProvider(current);
          continue;
        }

        const provider = await this.pickExternalProvider(current);
        if (!provider) {
          await this.warnNoProvider(current);
          continue;
        }
        current = await this.prisma.assignment.update({
          where: { id: current.id },
          data: {
            providerId: provider.id,
            providerRequestStatus: TransportRequestStatus.NOT_REQUIRED,
            providerWarningAt: null,
            providerViewedAt: null,
            providerRespondedAt: null,
            providerDeadline: null,
          },
          include: this.include,
        });
      }

      if (current.provider?.isCompany) continue;

      const sendAt = this.computeSendAt(current.startDate, settings);
      const deadline = this.computeDeadline(current.startDate, settings);

      if (current.providerRequestStatus === TransportRequestStatus.NOT_REQUIRED) {
        if (now.getTime() >= deadline.getTime()) {
          await this.expire(
            current,
            'Deadline passed before the request could be sent',
          );
          expired++;
          continue;
        }
        if (now.getTime() >= sendAt.getTime()) {
          await this.sendInternal(current, settings, deadline);
          sent++;
          const providerMode = current.provider?.assignmentMode;
          if (providerMode === ProviderAssignmentMode.FULLY_AUTO) {
            const didAssign = await this.tryAutoAssignInternal(current.id);
            if (didAssign) autoAssigned++;
          }
        }
        continue;
      }

      if (
        current.providerRequestStatus === TransportRequestStatus.REQUESTED ||
        current.providerRequestStatus === TransportRequestStatus.VIEWED
      ) {
        if (now.getTime() >= deadline.getTime()) {
          await this.expire(
            current,
            'No driver/vehicle confirmed before the deadline',
          );
          expired++;
          continue;
        }

        // Warn the provider 3 hours before the deadline, once per request.
        const warningAt = deadline.getTime() - 3 * 60 * 60 * 1000;
        if (now.getTime() >= warningAt && !current.providerWarningAt) {
          await this.warnProviderBeforeDeadline(current, deadline);
          warned++;
        }
      }
    }

    return { sent, expired, autoAssigned, warned };
  }

  /**
   * Prepare a departure day without dispatching: fill missing crew (company
   * first), send guide confirmation requests (freelance) / auto-confirm
   * company guides, and send/reserve transport provider requests for buses
   * that still have no driver. Safe to run repeatedly; available all day.
   */
  async prepareTomorrow(dateInput?: string, actor?: AuthenticatedUser) {
    const range = this.prepareRange(dateInput);
    const dateKey = this.dispatchPolicy.dayKey(range.start);
    const settings = await this.getSettings();
    const now = new Date();

    const assignments = await this.prisma.assignment.findMany({
      where: {
        status: {
          in: [
            AssignmentStatus.PENDING,
            AssignmentStatus.DRAFT_ASSIGNED,
            AssignmentStatus.TRANSFERRED,
          ],
        },
        executionMode: { not: AssignmentExecutionMode.OUTSOURCED_PARTNER },
        startDate: { gte: range.start, lte: range.end },
        bookings: { some: {} },
      },
      include: this.include,
      orderBy: { startDate: 'asc' },
      take: 200,
    });

    const summary = {
      date: dateKey,
      buses: assignments.length,
      crewAssigned: 0,
      guideRequestsSent: 0,
      companyGuidesAutoConfirmed: 0,
      providersReserved: 0,
      providerRequestsSent: 0,
      autoAssigned: 0,
      providerUnavailable: 0,
      freelanceAwaiting: 0,
      missing: [] as Array<{
        assignmentId: string;
        code: string | null;
        tourName: string | null;
        issues: string[];
      }>,
    };

    for (const booked of assignments) {
      let current: AssignmentView | null = booked;
      let guideJustAssigned = false;
      const needsGuide =
        current.executionMode !==
        AssignmentExecutionMode.COMPANY_DRIVER_ONLY;

      // 1. Fill missing crew (company/OFFICIAL guide + company driver first).
      if ((needsGuide && !current.guideId) || !current.driverId) {
        try {
          const crew = await this.autoCrew.assignCrewForBus(current.id);
          if (crew.assigned) {
            summary.crewAssigned += 1;
            guideJustAssigned = !!crew.updates?.guideId;
            current = await this.reloadAssignment(current.id);
          }
        } catch (error) {
          this.logger.warn(
            `Prepare auto-crew failed for ${booked.code ?? booked.id}: ${(error as Error).message}`,
          );
        }
      }
      if (!current) continue;

      // 2. Guide confirmation: company guides auto-confirm; freelance guides
      //    get the request once. A guide just assigned by auto-crew already has
      //    its request in flight, so do not send a duplicate here.
      if (
        !guideJustAssigned &&
        current.guideId &&
        !current.guideConfirmedAt &&
        !current.guideDeclinedAt
      ) {
        const guideType =
          current.guide?.guideProfile?.type ?? GuideType.FREELANCE;
        if (guideType === GuideType.OFFICIAL) {
          const changed =
            await this.guideConfirmation.ensureCompanyGuideConfirmed(
              current.id,
            );
          if (changed) {
            summary.companyGuidesAutoConfirmed += 1;
            current = await this.reloadAssignment(current.id);
          }
        } else if (!current.guideConfirmationRequestedAt) {
          const result = await this.guideConfirmation.request(current.id);
          if (result.requested) summary.guideRequestsSent += 1;
          current = await this.reloadAssignment(current.id);
        }
      }
      if (!current) continue;

      // 3. Transport provider: only when the bus still has no driver.
      if (!current.driverId) {
        if (!settings.enabled) {
          continue;
        }
        let provider = current.provider;
        if (!provider || provider.isCompany) {
          const picked = await this.pickExternalProvider(current);
          if (!picked) {
            summary.providerUnavailable += 1;
            await this.warnNoProvider(current);
            continue;
          }
          current = await this.prisma.assignment.update({
            where: { id: current.id },
            data: {
              providerId: picked.id,
              providerRequestStatus: TransportRequestStatus.NOT_REQUIRED,
              providerWarningAt: null,
              providerViewedAt: null,
              providerRespondedAt: null,
              providerDeadline: null,
            },
            include: this.include,
          });
          provider = current.provider;
          summary.providersReserved += 1;
        }

        if (
          provider &&
          provider.isCompany === false &&
          current.providerRequestStatus === TransportRequestStatus.NOT_REQUIRED
        ) {
          let deadline = this.computeDeadline(current.startDate, settings);
          if (deadline.getTime() <= now.getTime()) {
            // Explicit prepare click after the standard deadline: give the
            // provider a short fallback window up to departure.
            const tripStart = new Date(current.startDate).getTime();
            const leadMs = Math.max(1, settings.minLeadHours) * 60 * 60 * 1000;
            const fallback = Math.min(
              now.getTime() + leadMs,
              tripStart,
            );
            if (fallback <= now.getTime()) {
              continue;
            }
            deadline = new Date(fallback);
          }
          await this.sendInternal(current, settings, deadline);
          summary.providerRequestsSent += 1;
          current = await this.reloadAssignment(current.id);
          if (
            current?.provider?.assignmentMode ===
            ProviderAssignmentMode.FULLY_AUTO
          ) {
            const didAssign = await this.tryAutoAssignInternal(current.id);
            if (didAssign) summary.autoAssigned += 1;
            current = await this.reloadAssignment(current.id);
          }
        }
      }
    }

    // 4. Final readiness list (what still needs a human).
    const finalRows = await this.prisma.assignment.findMany({
      where: { id: { in: assignments.map((a) => a.id) } },
      include: this.include,
    });
    for (const row of finalRows) {
      const issues: string[] = [];
      const needsGuide =
        row.executionMode !== AssignmentExecutionMode.COMPANY_DRIVER_ONLY;
      if (needsGuide && !row.guideId) issues.push('No tour guide');
      if (needsGuide && row.guideId) {
        const guideType =
          row.guide?.guideProfile?.type ?? GuideType.FREELANCE;
        if (row.guideDeclinedAt) issues.push('Guide declined');
        if (
          guideType === GuideType.FREELANCE &&
          !row.guideConfirmedAt &&
          !row.guideDeclinedAt
        ) {
          issues.push('Freelance guide not confirmed');
          summary.freelanceAwaiting += 1;
        }
      }
      if (!row.driverId) issues.push('No driver');
      if (row.bookings.some((booking) => isUnpaidPayPalBooking(booking))) {
        issues.push('Unpaid PayPal booking');
      }
      const external =
        !!row.providerId && row.provider?.isCompany === false;
      if (external) {
        if (!row.vehicleId) issues.push('No vehicle');
        if (row.providerRequestStatus !== TransportRequestStatus.ASSIGNED) {
          issues.push('Provider request not assigned');
        }
      }
      if (issues.length > 0) {
        summary.missing.push({
          assignmentId: row.id,
          code: row.code ?? null,
          tourName: row.tourName ?? null,
          issues: Array.from(new Set(issues)),
        });
      }
    }

    await this.audit.log({
      entityType: 'Assignment',
      entityId: `PREPARE_${dateKey}`,
      action: 'PREPARE_DEPARTURE_DAY',
      afterData: summary as unknown as Prisma.InputJsonValue,
      changedBy: actor?.id ?? null,
    });
    this.gateway.notifyAll('board:refresh', { action: 'prepare_day' });
    return summary;
  }

  private prepareRange(dateInput?: string) {
    if (dateInput?.trim()) {
      const date = new Date(dateInput);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid prepare date');
      }
      return this.dispatchPolicy.dayRange(date);
    }
    const today = this.dispatchPolicy.todayHcm();
    return this.dispatchPolicy.dayRange(
      this.dispatchPolicy.addDays(today.start, 1),
    );
  }

  private async reloadAssignment(id: string) {
    return this.prisma.assignment.findUnique({
      where: { id },
      include: this.include,
    });
  }

  /**
   * Reserve one external provider for the bus: never the company fleet, and
   * at most one bus per provider per departure date (least busy first).
   */
  private async pickExternalProvider(assignment: AssignmentView) {
    const range = {
      start: this.startOfDay(assignment.startDate),
      end: this.endOfDay(assignment.startDate),
    };
    const [providers, used, workload] = await Promise.all([
      this.prisma.transportationProvider.findMany({
        where: {
          isCompany: false,
          users: { some: { isActive: true, role: RoleType.DRIVER } },
        },
        select: { id: true, name: true },
      }),
      this.prisma.assignment.findMany({
        where: {
          id: { not: assignment.id },
          providerId: { not: null },
          status: { not: AssignmentStatus.CANCELED },
          startDate: { gte: range.start, lte: range.end },
        },
        select: { providerId: true },
      }),
      this.prisma.assignment.groupBy({
        by: ['providerId'],
        where: {
          providerId: { not: null },
          status: { not: AssignmentStatus.CANCELED },
          startDate: { gte: this.daysAgo(30), lte: this.daysAhead(30) },
        },
        _count: { _all: true },
      }),
    ]);
    const usedIds = new Set(used.map((row) => row.providerId));
    const workloadMap = new Map(
      workload.map((row) => [row.providerId, row._count._all]),
    );
    const candidates = providers.filter((provider) => !usedIds.has(provider.id));
    if (candidates.length === 0) return null;
    candidates.sort(
      (a, b) =>
        (workloadMap.get(a.id) ?? 0) - (workloadMap.get(b.id) ?? 0) ||
        a.name.localeCompare(b.name),
    );
    return candidates[0];
  }

  private async warnProviderBeforeDeadline(
    assignment: AssignmentView,
    deadline: Date,
  ) {
    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: { providerWarningAt: new Date() },
    });
    const message = `${assignment.tourName ?? assignment.code ?? 'Tour'} on ${this.formatDateTime(assignment.startDate)} still has no driver/vehicle. Confirm before ${this.formatDateTime(deadline)} or the travel agent will assign another provider.`;
    await this.notifyProvider(
      assignment.providerId!,
      'Driver assignment deadline approaching',
      message,
      {
        kind: 'TRANSPORT_WARNING',
        assignmentId: assignment.id,
        status: assignment.providerRequestStatus,
        url: '/transport-provider/requests',
      },
    );
    await this.sendAlertEmails(assignment, {
      title: 'Provider has not assigned a driver yet',
      message,
      audience: 'both',
    });
    this.gateway.notifyAll('transport:refresh', {
      assignmentId: assignment.id,
    });
  }

  private async warnNoProvider(assignment: AssignmentView) {
    const recent =
      assignment.providerWarningAt &&
      Date.now() - assignment.providerWarningAt.getTime() < 6 * 60 * 60 * 1000;
    if (recent) return;
    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: { providerWarningAt: new Date() },
    });
    const message = `${assignment.tourName ?? assignment.code ?? 'Tour'} on ${this.formatDateTime(assignment.startDate)} has no available company driver and no external provider left for that date. Assign a provider manually.`;
    await this.notifyAdmins('No transport provider available', message, {
      kind: 'TRANSPORT_NO_PROVIDER',
      assignmentId: assignment.id,
      url: '/service/transport-requests',
    });
    await this.sendAlertEmails(assignment, {
      title: 'No transport provider available',
      message,
      audience: 'admin',
    });
  }

  private async sendAlertEmails(
    assignment: AssignmentView,
    input: { title: string; message: string; audience: 'admin' | 'provider' | 'both' },
  ) {
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const adminEmails =
      input.audience === 'provider'
        ? []
        : (
            await this.prisma.user.findMany({
              where: {
                role: { in: [RoleType.ADMIN, RoleType.OFFICE] },
                isActive: true,
              },
              select: { email: true },
            })
          ).map((user) => user.email);
    const providerEmails =
      input.audience === 'admin' || !assignment.providerId
        ? []
        : (
            await this.prisma.user.findMany({
              where: {
                role: RoleType.TRANSPORT_PROVIDER,
                providerId: assignment.providerId,
                isActive: true,
              },
              select: { email: true },
            })
          ).map((user) => user.email);

    if (adminEmails.length > 0) {
      await this.mail.sendTransportAlert({
        to: adminEmails,
        title: input.title,
        message: input.message,
        reference: assignment.code ?? assignment.id,
        actionLabel: 'Open Transport requests',
        actionUrl: `${frontend}/service/transport-requests`,
      });
    }
    if (providerEmails.length > 0) {
      await this.mail.sendTransportAlert({
        to: providerEmails,
        title: input.title,
        message: input.message,
        reference: assignment.code ?? assignment.id,
        actionLabel: 'Open my transport requests',
        actionUrl: `${frontend}/transport-provider/requests`,
      });
    }
  }

  private async sendInternal(
    assignment: AssignmentView,
    settings: TransportSettings,
    deadline: Date,
  ) {
    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        providerRequestStatus: TransportRequestStatus.REQUESTED,
        providerRequestedAt: new Date(),
        providerRequestedById: null,
        providerDeadline: deadline,
        providerWarningAt: null,
        providerViewedAt: null,
        providerRespondedAt: null,
        providerResponseNote: null,
        providerDeclineReason: null,
        providerAssignedById: null,
        driverId: null,
        vehicleId: null,
      },
    });
    await this.audit.log({
      entityType: 'Assignment',
      entityId: assignment.id,
      action: 'TRANSPORT_REQUEST_AUTO_SEND',
      afterData: { deadline, settings },
      changedBy: null,
    });
    if (assignment.providerId) {
      const suggestion = await this.suggestionText(assignment);
      await this.notifyProvider(
        assignment.providerId,
        'New transport request',
        `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} · ${assignment.totalPax} pax. ${suggestion} Deadline ${this.formatDateTime(deadline)}.`,
        {
          kind: 'TRANSPORT_REQUESTED',
          assignmentId: assignment.id,
          status: TransportRequestStatus.REQUESTED,
          url: '/transport-provider/requests',
        },
      );
      await this.sendProviderEmail(assignment.providerId, {
        title: 'New transport request',
        message: `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} · ${assignment.totalPax} pax. ${suggestion} Deadline ${this.formatDateTime(deadline)}. Log in to assign a driver and vehicle or decline.`,
        reference: assignment.code ?? assignment.id,
      });
    }
    this.gateway.notifyAll('transport:refresh', {
      assignmentId: assignment.id,
    });
  }

  private async expire(assignment: AssignmentView, reason: string) {
    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        providerRequestStatus: TransportRequestStatus.EXPIRED,
        providerRespondedAt: new Date(),
        providerResponseNote: reason,
      },
    });
    await this.audit.log({
      entityType: 'Assignment',
      entityId: assignment.id,
      action: 'TRANSPORT_REQUEST_EXPIRE',
      afterData: { reason },
      changedBy: null,
    });
    const expiredMessage = `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} has no provider driver/vehicle. ${reason}. Assign another transportation provider or place the trip on the Waiting List.`;
    await this.notifyAdmins(
      'Transport request expired',
      expiredMessage,
      {
        kind: 'TRANSPORT_EXPIRED',
        assignmentId: assignment.id,
        status: TransportRequestStatus.EXPIRED,
        url: '/service/transport-requests',
      },
    );
    await this.sendAlertEmails(assignment, {
      title: 'Transport request expired — assign another provider',
      message: expiredMessage,
      audience: 'both',
    });
    if (assignment.providerId) {
      await this.notifyProvider(
        assignment.providerId,
        'Transport request expired',
        `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} expired without an assignment.`,
        {
          kind: 'TRANSPORT_EXPIRED',
          assignmentId: assignment.id,
          status: TransportRequestStatus.EXPIRED,
          url: '/transport-provider/requests',
        },
      );
    }
    this.gateway.notifyAll('transport:refresh', {
      assignmentId: assignment.id,
    });
  }

  private async tryAutoAssignInternal(assignmentId: string) {
    const assignment = await this.loadAssignment(assignmentId);
    if (!assignment.providerId) return false;
    const start = this.startOfDay(assignment.startDate);
    const end = this.endOfDay(assignment.endDate);
    const drivers = await this.prisma.user.findMany({
      where: {
        role: RoleType.DRIVER,
        isActive: true,
        providerId: assignment.providerId,
      },
      select: { id: true },
    });
    const driverIds = drivers.map((d) => d.id);
    const [busyDrivers, workload, leaves] = await Promise.all([
      this.busyDriverIds(driverIds, start, end, assignment.id),
      this.driverWorkload(
        driverIds,
        this.daysAgo(WORKLOAD_WINDOW_DAYS),
        this.daysAhead(WORKLOAD_WINDOW_DAYS),
        assignment.id,
      ),
      this.leaveMap(driverIds, start, end),
    ]);
    const ranked = drivers
      .filter((d) => !busyDrivers.has(d.id) && !leaves.has(d.id))
      .map((d) => {
        const load = workload.get(d.id) ?? { days: 0, trips: 0 };
        return { id: d.id, ...load };
      })
      .sort((a, b) => a.days - b.days || a.trips - b.trips);
    const driverId = ranked[0]?.id;
    if (!driverId) return false;

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        providerId: assignment.providerId,
        ...(assignment.totalPax
          ? { capacity: { gte: assignment.totalPax } }
          : {}),
      },
      select: { id: true, capacity: true },
      orderBy: [{ capacity: 'asc' }, { plateNumber: 'asc' }],
    });
    const busyVehicles = await this.busyVehicleIds(
      vehicles.map((v) => v.id),
      start,
      end,
      assignment.id,
    );
    const vehicleId = vehicles.find((v) => !busyVehicles.has(v.id))?.id;
    if (!vehicleId) return false;

    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        driverId,
        vehicleId,
        providerRequestStatus: TransportRequestStatus.ASSIGNED,
        providerWarningAt: null,
        providerRespondedAt: new Date(),
        providerResponseNote: 'Automatically assigned by provider settings',
        providerAssignedById: null,
        providerDeclineReason: null,
      },
    });
    await this.audit.log({
      entityType: 'Assignment',
      entityId: assignment.id,
      action: 'TRANSPORT_REQUEST_AUTO_ASSIGN',
      afterData: { driverId, vehicleId },
      changedBy: null,
    });
    await this.notifyAdmins(
      'Transport request auto-assigned',
      `${assignment.provider?.name ?? 'Provider'} auto-assigned ${assignment.tourName ?? assignment.code ?? 'tour'} · ${this.formatDateTime(assignment.startDate)}.`,
      {
        kind: 'TRANSPORT_ASSIGNED',
        assignmentId: assignment.id,
        status: TransportRequestStatus.ASSIGNED,
        url: '/service/transport-requests',
      },
    );
    this.gateway.notifyAll('transport:refresh', {
      assignmentId: assignment.id,
    });
    return true;
  }

  private async applyAssignment(
    assignment: AssignmentView,
    input: {
      providerId: string;
      driverId: string;
      vehicleId: string;
      note?: string;
      actor: AuthenticatedUser;
      source: 'ADMIN_OVERRIDE' | 'PROVIDER_MANUAL' | 'PROVIDER_AUTO';
    },
  ) {
    await this.assertChangeWindowOpen(assignment);
    const driver = await this.prisma.user.findUnique({
      where: { id: input.driverId },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        providerId: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.role !== RoleType.DRIVER) {
      throw new BadRequestException('Only DRIVER accounts can be assigned');
    }
    if (!driver.isActive)
      throw new BadRequestException('This driver is inactive');
    if (driver.providerId !== input.providerId) {
      throw new BadRequestException(
        'This driver does not belong to the selected provider',
      );
    }

    const start = this.startOfDay(assignment.startDate);
    const end = this.endOfDay(assignment.endDate);
    if (await this.leaves.hasLeaveConflict(driver.id, start, end)) {
      throw new BadRequestException(
        'This driver is on leave during the trip dates',
      );
    }
    const busyDrivers = await this.busyDriverIds(
      [driver.id],
      start,
      end,
      assignment.id,
    );
    if (busyDrivers.has(driver.id)) {
      throw new BadRequestException(
        'This driver is already assigned to another trip on these dates',
      );
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
      select: {
        id: true,
        providerId: true,
        capacity: true,
        plateNumber: true,
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.providerId !== input.providerId) {
      throw new BadRequestException(
        'This vehicle does not belong to the selected provider',
      );
    }
    if (assignment.totalPax && (vehicle.capacity ?? 0) < assignment.totalPax) {
      throw new BadRequestException(
        `Vehicle ${vehicle.plateNumber} seats ${vehicle.capacity ?? 0}, but the trip has ${assignment.totalPax} pax`,
      );
    }
    const busyVehicles = await this.busyVehicleIds(
      [vehicle.id],
      start,
      end,
      assignment.id,
    );
    if (busyVehicles.has(vehicle.id)) {
      throw new BadRequestException(
        'This vehicle is already assigned to another trip on these dates',
      );
    }
    const vehicleId = vehicle.id;

    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        providerId: input.providerId,
        driverId: driver.id,
        vehicleId,
        providerRequestStatus: TransportRequestStatus.ASSIGNED,
        providerWarningAt: null,
        providerRespondedAt: new Date(),
        providerResponseNote: input.note ?? null,
        providerDeclineReason: null,
        providerAssignedById: input.actor.id,
      },
    });
    await this.audit.log({
      entityType: 'Assignment',
      entityId: assignment.id,
      action: 'TRANSPORT_REQUEST_ASSIGN',
      beforeData: {
        driverId: assignment.driverId,
        vehicleId: assignment.vehicleId,
        status: assignment.providerRequestStatus,
      },
      afterData: {
        driverId: driver.id,
        vehicleId,
        source: input.source,
        note: input.note ?? null,
      },
      changedBy: input.actor.id,
    });

    await this.notifyCrewAssigned(
      assignment,
      driver.id,
      driver.name ?? 'Driver',
      vehicle.plateNumber ?? 'vehicle',
    );
  }

  private async notifyCrewAssigned(
    assignment: AssignmentView,
    driverId: string,
    driverName: string,
    vehiclePlate: string,
  ) {
    const recipients = [driverId, assignment.guideId].filter(
      (id): id is string => Boolean(id),
    );
    if (recipients.length === 0) return;

    const crew = [
      assignment.guide?.name ? `Guide: ${assignment.guide.name}` : null,
      `Driver: ${driverName}`,
      `Vehicle: ${vehiclePlate}`,
    ]
      .filter(Boolean)
      .join(' · ');

    await this.notifyUsers(
      recipients,
      'Tour assignment confirmed',
      `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} · ${crew}.`,
      {
        kind: 'TRANSPORT_ASSIGNED',
        assignmentId: assignment.id,
        status: TransportRequestStatus.ASSIGNED,
      },
    );
  }

  private async notifyUsers(
    userIds: string[],
    title: string,
    body: string,
    data: Record<string, any>,
  ) {
    for (const userId of [...new Set(userIds)]) {
      const notification = await this.notificationService.create(
        userId,
        NotificationType.GENERAL,
        title,
        body,
        data,
      );
      this.gateway.notifyUser(userId, 'notification', notification);
    }
  }

  private async loadAssignment(id: string): Promise<AssignmentView> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: this.include,
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  private assertRequestable(assignment: AssignmentView) {
    if (
      assignment.executionMode === AssignmentExecutionMode.OUTSOURCED_PARTNER
    ) {
      throw new BadRequestException(
        'Outsourced partner trips do not use transport requests',
      );
    }
    if (
      assignment.status === AssignmentStatus.CANCELED ||
      assignment.status === AssignmentStatus.COMPLETED ||
      assignment.status === AssignmentStatus.DISPATCHED ||
      assignment.status === AssignmentStatus.VERIFYING
    ) {
      throw new BadRequestException(
        'This trip is already dispatched or closed — driver/provider changes are locked.',
      );
    }
  }

  private assertProviderCanRespond(assignment: AssignmentView) {
    if (
      assignment.status === AssignmentStatus.DISPATCHED ||
      assignment.status === AssignmentStatus.VERIFYING ||
      assignment.status === AssignmentStatus.COMPLETED ||
      assignment.status === AssignmentStatus.CANCELED
    ) {
      throw new BadRequestException(
        'This trip is already dispatched or closed — the request is no longer available.',
      );
    }
    if (
      assignment.providerRequestStatus !== TransportRequestStatus.REQUESTED &&
      assignment.providerRequestStatus !== TransportRequestStatus.VIEWED
    ) {
      throw new BadRequestException(
        'This transport request is not open for a response',
      );
    }
    if (
      assignment.providerDeadline &&
      assignment.providerDeadline.getTime() < Date.now()
    ) {
      throw new BadRequestException('The response deadline has passed');
    }
  }

  /** The travel agent can keep adjusting the provider driver/vehicle until the
   *  recall cutoff (default 06:00) on the departure day. After that the trip is
   *  treated as departed and crew/provider changes are locked. */
  private async assertChangeWindowOpen(assignment: AssignmentView) {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: RECALL_CUTOFF_KEY },
    });
    const time =
      row?.value && HHMM_PATTERN.test(row.value)
        ? row.value
        : DEFAULT_RECALL_CUTOFF;
    const [hours, minutes] = time.split(':').map(Number);
    const cutoff = new Date(assignment.startDate);
    cutoff.setHours(hours, minutes, 0, 0);
    if (Date.now() > cutoff.getTime()) {
      throw new BadRequestException(
        `Driver/vehicle changes are locked after ${time} on the departure day for "${assignment.code ?? 'Bus'}"`,
      );
    }
  }

  private isAdminOrOffice(actor: AuthenticatedUser) {
    return actor.role === RoleType.ADMIN || actor.role === RoleType.OFFICE;
  }

  private isProvider(actor: AuthenticatedUser) {
    return actor.role === RoleType.TRANSPORT_PROVIDER;
  }

  private assertAdminOrOffice(actor: AuthenticatedUser) {
    if (!this.isAdminOrOffice(actor)) {
      throw new ForbiddenException(
        'Only Admin or Office can manage transport requests',
      );
    }
  }

  private assertProviderAccess(
    actor: AuthenticatedUser,
    assignment: AssignmentView,
  ) {
    if (this.isAdminOrOffice(actor)) return;
    if (!this.isProvider(actor)) {
      throw new ForbiddenException(
        'Only the transportation provider can respond to this request',
      );
    }
    if (!actor.providerId || assignment.providerId !== actor.providerId) {
      throw new ForbiddenException(
        'This transport request belongs to another provider',
      );
    }
  }

  private resolveProviderId(actor: AuthenticatedUser, providerId?: string) {
    if (this.isProvider(actor)) {
      if (!actor.providerId) {
        throw new ForbiddenException(
          'Your account is not linked to a transportation provider',
        );
      }
      return actor.providerId;
    }
    if (!this.isAdminOrOffice(actor)) {
      throw new ForbiddenException(
        'Only Admin, Office or Transport Provider can change this setting',
      );
    }
    if (!providerId) {
      throw new BadRequestException('providerId is required');
    }
    return providerId;
  }

  private toView(a: AssignmentView) {
    const booking = a.bookings?.[0];
    const pickups =
      Array.isArray(a.pickupInfo) && a.pickupInfo.length > 0
        ? a.pickupInfo
        : (a.bookings ?? [])
            .filter((item: any) => item.hotelName || item.address)
            .map((item: any) => ({
              bookingRef: item.bookingRef,
              customerName: item.customerName,
              pickup: item.hotelName || item.address,
              totalPax: item.totalPax ?? 0,
            }));
    return {
      id: a.id,
      code: a.code,
      tourName: a.tourName ?? booking?.tour?.name ?? null,
      tourCode: booking?.tour?.code ?? null,
      tourType: a.tourType,
      durationDays: a.durationDays,
      totalPax: a.totalPax,
      startDate: a.startDate,
      endDate: a.endDate,
      status: a.status,
      executionMode: a.executionMode,
      groupRef: a.groupRef,
      provider: a.provider,
      driver: a.driver,
      vehicle: a.vehicle,
      guide: a.guide,
      pickups,
      providerRequestStatus: a.providerRequestStatus,
      providerRequestedAt: a.providerRequestedAt,
      providerViewedAt: a.providerViewedAt,
      providerRespondedAt: a.providerRespondedAt,
      providerDeadline: a.providerDeadline,
      providerWarningAt: a.providerWarningAt,
      lateBookings: (a.bookings ?? []).filter((b: any) => b.lateBooking).length,
      providerRequestNote: a.providerRequestNote,
      providerResponseNote: a.providerResponseNote,
      providerDeclineReason: a.providerDeclineReason,
      providerAssignmentMode: a.provider?.assignmentMode ?? null,
    };
  }

  /** Email the provider accounts for their own routes (they log in to respond). */
  private async sendProviderEmail(
    providerId: string,
    input: { title: string; message: string; reference?: string | null },
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        role: RoleType.TRANSPORT_PROVIDER,
        providerId,
        isActive: true,
      },
      select: { email: true },
    });
    const emails = users
      .map((user) => (user.email ?? '').trim())
      .filter((email) => email.length > 0);
    if (emails.length === 0) return;
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    await this.mail.sendTransportAlert({
      to: emails,
      title: input.title,
      message: input.message,
      reference: input.reference ?? null,
      actionLabel: 'Open transport requests',
      actionUrl: `${frontend}/transport-provider/requests`,
    });
  }

  private async notifyProvider(
    providerId: string,
    title: string,
    body: string,
    data: Record<string, any>,
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        role: RoleType.TRANSPORT_PROVIDER,
        providerId,
        isActive: true,
      },
      select: { id: true },
    });
    for (const user of users) {
      const notification = await this.notificationService.create(
        user.id,
        NotificationType.GENERAL,
        title,
        body,
        data,
      );
      this.gateway.notifyUser(user.id, 'notification', notification);
    }
  }

  private async notifyAdmins(
    title: string,
    body: string,
    data: Record<string, any>,
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: [RoleType.ADMIN, RoleType.OFFICE] },
        isActive: true,
      },
      select: { id: true },
    });
    for (const user of users) {
      const notification = await this.notificationService.create(
        user.id,
        NotificationType.GENERAL,
        title,
        body,
        data,
      );
      this.gateway.notifyUser(user.id, 'notification', notification);
    }
  }

  private async busyDriverIds(
    driverIds: string[],
    start: Date,
    end: Date,
    excludeAssignmentId: string,
  ) {
    if (!driverIds.length) return new Set<string>();
    const rows = await this.prisma.assignment.findMany({
      where: {
        id: { not: excludeAssignmentId },
        status: { not: AssignmentStatus.CANCELED },
        driverId: { in: driverIds },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { driverId: true },
    });
    return new Set(rows.map((r) => r.driverId).filter((x): x is string => !!x));
  }

  private async busyVehicleIds(
    vehicleIds: string[],
    start: Date,
    end: Date,
    excludeAssignmentId: string,
  ) {
    if (!vehicleIds.length) return new Set<string>();
    const rows = await this.prisma.assignment.findMany({
      where: {
        id: { not: excludeAssignmentId },
        status: { not: AssignmentStatus.CANCELED },
        vehicleId: { in: vehicleIds },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { vehicleId: true },
    });
    return new Set(
      rows.map((r) => r.vehicleId).filter((x): x is string => !!x),
    );
  }

  private async driverWorkload(
    driverIds: string[],
    windowStart: Date,
    windowEnd: Date,
    excludeAssignmentId: string,
  ) {
    const map = new Map<string, { days: number; trips: number }>();
    if (!driverIds.length) return map;
    const rows = await this.prisma.assignment.findMany({
      where: {
        id: { not: excludeAssignmentId },
        status: { not: AssignmentStatus.CANCELED },
        driverId: { in: driverIds },
        startDate: { lte: windowEnd },
        endDate: { gte: windowStart },
      },
      select: { driverId: true, startDate: true, endDate: true },
    });
    for (const row of rows) {
      if (!row.driverId) continue;
      const current = map.get(row.driverId) ?? { days: 0, trips: 0 };
      const start = Math.max(
        this.startOfDay(row.startDate).getTime(),
        windowStart.getTime(),
      );
      const end = Math.min(
        this.endOfDay(row.endDate).getTime(),
        windowEnd.getTime(),
      );
      current.days += Math.max(1, Math.floor((end - start) / DAY_MS) + 1);
      current.trips += 1;
      map.set(row.driverId, current);
    }
    return map;
  }

  private async leaveMap(driverIds: string[], start: Date, end: Date) {
    const result = new Set<string>();
    for (const id of driverIds) {
      if (await this.leaves.hasLeaveConflict(id, start, end)) result.add(id);
    }
    return result;
  }

  private computeSendAt(startDate: Date, settings: TransportSettings) {
    return this.hcmDateTime(
      startDate,
      -settings.sendDaysBefore,
      settings.sendTime,
    );
  }

  private computeDeadline(startDate: Date, settings: TransportSettings) {
    const dayBefore = this.hcmDateTime(startDate, -1, settings.deadlineTime);
    const latest = new Date(
      startDate.getTime() - settings.minLeadHours * 60 * 60 * 1000,
    );
    return new Date(Math.min(dayBefore.getTime(), latest.getTime()));
  }

  private hcmDateTime(date: Date, dayOffset: number, time: string) {
    const shifted = new Date(date.getTime() + HCM_OFFSET_MINUTES * 60 * 1000);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth();
    const day = shifted.getUTCDate();
    const [hours, minutes] = time.split(':').map(Number);
    return new Date(
      Date.UTC(year, month, day + dayOffset, hours, minutes) -
        HCM_OFFSET_MINUTES * 60 * 1000,
    );
  }

  private startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private daysAgo(days: number) {
    const d = this.startOfDay(new Date());
    d.setDate(d.getDate() - days);
    return d;
  }

  private daysAhead(days: number) {
    const d = this.endOfDay(new Date());
    d.setDate(d.getDate() + days);
    return d;
  }

  private intSetting(
    value: string | undefined,
    fallback: number,
    min: number,
    max: number,
  ) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(parsed)));
  }

  private formatDateTime(value: Date | string | null | undefined) {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
