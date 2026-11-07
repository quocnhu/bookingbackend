"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TransportRequestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportRequestsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const leaves_service_1 = require("../leaves/leaves.service");
const notification_service_1 = require("../notifications/notification.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
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
    deadlineTime: '23:00',
    minLeadHours: 8,
};
const RECALL_CUTOFF_KEY = 'recallCutoffTime';
const DEFAULT_RECALL_CUTOFF = '06:00';
const assignmentInclude = {
    bookings: {
        orderBy: { paxSequence: 'asc' },
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
    guide: { select: { id: true, name: true } },
};
let TransportRequestsService = TransportRequestsService_1 = class TransportRequestsService {
    prisma;
    audit;
    leaves;
    notificationService;
    gateway;
    logger = new common_1.Logger(TransportRequestsService_1.name);
    runningScheduledTick = false;
    constructor(prisma, audit, leaves, notificationService, gateway) {
        this.prisma = prisma;
        this.audit = audit;
        this.leaves = leaves;
        this.notificationService = notificationService;
        this.gateway = gateway;
    }
    include = assignmentInclude;
    async list(query, actor) {
        const where = {
            executionMode: { not: client_1.AssignmentExecutionMode.OUTSOURCED_PARTNER },
            status: { not: client_1.AssignmentStatus.CANCELED },
            endDate: { gte: this.daysAgo(30) },
        };
        const and = [];
        if (this.isProvider(actor)) {
            if (!actor.providerId) {
                throw new common_1.ForbiddenException('Your account is not linked to a transportation provider');
            }
            where.providerId = actor.providerId;
            and.push({
                providerRequestStatus: {
                    in: [
                        client_1.TransportRequestStatus.REQUESTED,
                        client_1.TransportRequestStatus.VIEWED,
                        client_1.TransportRequestStatus.ASSIGNED,
                        client_1.TransportRequestStatus.DECLINED,
                        client_1.TransportRequestStatus.EXPIRED,
                    ],
                },
            });
        }
        else if (this.isAdminOrOffice(actor)) {
            if (query.status)
                where.providerRequestStatus = query.status;
            if (query.providerId)
                where.providerId = query.providerId;
        }
        else {
            throw new common_1.ForbiddenException('Only Admin, Office or Transport Provider can view transport requests');
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
        if (query.from)
            and.push({ startDate: { gte: new Date(query.from) } });
        if (query.to)
            and.push({ startDate: { lte: new Date(`${query.to}T23:59:59.999`) } });
        if (and.length)
            where.AND = and;
        const items = await this.prisma.assignment.findMany({
            where,
            include: this.include,
            orderBy: [{ startDate: 'asc' }, { providerDeadline: 'asc' }],
            take: 500,
        });
        return items.map((item) => this.toView(item));
    }
    async getCandidates(assignmentId, actor) {
        const assignment = await this.loadAssignment(assignmentId);
        this.assertProviderAccess(actor, assignment);
        return this.buildCandidates(assignment);
    }
    async buildCandidates(assignment) {
        const providerId = assignment.providerId;
        if (!providerId) {
            throw new common_1.BadRequestException('This assignment has no transportation provider');
        }
        const start = this.startOfDay(assignment.startDate);
        const end = this.endOfDay(assignment.endDate);
        const windowStart = this.daysAgo(WORKLOAD_WINDOW_DAYS);
        const windowEnd = this.daysAhead(WORKLOAD_WINDOW_DAYS);
        const drivers = await this.prisma.user.findMany({
            where: {
                role: client_1.RoleType.DRIVER,
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
        driverRows.sort((a, b) => Number(b.available) - Number(a.available) ||
            a.workloadDays - b.workloadDays ||
            a.workloadTrips - b.workloadTrips ||
            b.rating - a.rating ||
            (a.name ?? '').localeCompare(b.name ?? ''));
        const vehicles = await this.prisma.vehicle.findMany({
            where: { providerId },
            select: { id: true, plateNumber: true, capacity: true, brand: true },
            orderBy: [{ capacity: 'asc' }, { plateNumber: 'asc' }],
        });
        const busyVehicles = await this.busyVehicleIds(vehicles.map((v) => v.id), start, end, assignment.id);
        const vehicleRows = vehicles
            .map((vehicle) => ({
            ...vehicle,
            available: !busyVehicles.has(vehicle.id) &&
                (!assignment.totalPax ||
                    (vehicle.capacity ?? 0) >= assignment.totalPax),
            busy: busyVehicles.has(vehicle.id),
        }))
            .sort((a, b) => Number(b.available) - Number(a.available) ||
            (a.capacity ?? 0) - (b.capacity ?? 0) ||
            a.plateNumber.localeCompare(b.plateNumber));
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
    async suggestionText(assignment) {
        try {
            const candidates = await this.buildCandidates(assignment);
            const driver = candidates.drivers.find((d) => d.id === candidates.recommendedDriverId);
            const vehicle = candidates.vehicles.find((v) => v.id === candidates.recommendedVehicleId);
            if (!driver)
                return 'No available driver found — please assign manually.';
            return `Suggested driver: ${driver.name ?? driver.email ?? driver.id}${vehicle?.plateNumber ? ` · vehicle ${vehicle.plateNumber}` : ''}. Accept or change this before the deadline.`;
        }
        catch {
            return 'Open the request to choose a driver and vehicle.';
        }
    }
    async send(assignmentId, dto, actor) {
        this.assertAdminOrOffice(actor);
        const assignment = await this.loadAssignment(assignmentId);
        this.assertRequestable(assignment);
        const providerId = dto.providerId ?? assignment.providerId;
        if (!providerId) {
            throw new common_1.BadRequestException('Select a transportation provider before sending the request');
        }
        const provider = await this.prisma.transportationProvider.findUnique({
            where: { id: providerId },
        });
        if (!provider)
            throw new common_1.NotFoundException('Transportation provider not found');
        const settings = await this.getSettings();
        const deadline = dto.deadline
            ? new Date(dto.deadline)
            : this.computeDeadline(assignment.startDate, settings);
        if (Number.isNaN(deadline.getTime())) {
            throw new common_1.BadRequestException('Invalid deadline');
        }
        if (deadline.getTime() <= Date.now()) {
            throw new common_1.BadRequestException('The response deadline must be in the future');
        }
        const updated = await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                providerId,
                providerRequestStatus: client_1.TransportRequestStatus.REQUESTED,
                providerRequestedAt: new Date(),
                providerRequestedById: actor.id,
                providerDeadline: deadline,
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
        const suggestion = await this.suggestionText(updated);
        await this.notifyProvider(providerId, 'New transport request', `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} · ${updated.totalPax} pax. ${suggestion} Deadline ${this.formatDateTime(deadline)}.`, {
            kind: 'TRANSPORT_REQUESTED',
            assignmentId: updated.id,
            status: updated.providerRequestStatus,
            url: '/transport-provider/requests',
        });
        this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
        return this.toView(updated);
    }
    async cancel(assignmentId, dto, actor) {
        this.assertAdminOrOffice(actor);
        const assignment = await this.loadAssignment(assignmentId);
        const updated = await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                providerRequestStatus: client_1.TransportRequestStatus.CANCELLED,
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
            await this.notifyProvider(assignment.providerId, 'Transport request cancelled', `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} was cancelled.`, {
                kind: 'TRANSPORT_CANCELLED',
                assignmentId: updated.id,
                status: updated.providerRequestStatus,
                url: '/transport-provider/requests',
            });
        }
        this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
        return this.toView(updated);
    }
    async override(assignmentId, dto, actor) {
        this.assertAdminOrOffice(actor);
        const assignment = await this.loadAssignment(assignmentId);
        this.assertRequestable(assignment);
        const providerId = dto.providerId ?? assignment.providerId;
        if (!providerId) {
            throw new common_1.BadRequestException('Select a transportation provider first');
        }
        await this.applyAssignment(assignment, {
            providerId,
            driverId: dto.driverId,
            vehicleId: dto.vehicleId,
            note: dto.note,
            actor,
            source: 'ADMIN_OVERRIDE',
        });
        const updated = await this.loadAssignment(assignmentId);
        await this.notifyProvider(providerId, 'Driver & vehicle assigned', `${updated.tourName ?? updated.code ?? 'Tour'} · ${this.formatDateTime(updated.startDate)} was assigned by the travel agent.`, {
            kind: 'TRANSPORT_ASSIGNED',
            assignmentId: updated.id,
            status: updated.providerRequestStatus,
            url: '/transport-provider/requests',
        });
        this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
        return this.toView(updated);
    }
    async markViewed(assignmentId, actor) {
        const assignment = await this.loadAssignment(assignmentId);
        this.assertProviderAccess(actor, assignment);
        if (assignment.providerRequestStatus !== client_1.TransportRequestStatus.REQUESTED) {
            return this.toView(assignment);
        }
        const updated = await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                providerRequestStatus: client_1.TransportRequestStatus.VIEWED,
                providerViewedAt: new Date(),
            },
            include: this.include,
        });
        this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
        return this.toView(updated);
    }
    async assign(assignmentId, dto, actor) {
        const assignment = await this.loadAssignment(assignmentId);
        this.assertProviderAccess(actor, assignment);
        this.assertProviderCanRespond(assignment);
        await this.applyAssignment(assignment, {
            providerId: assignment.providerId,
            driverId: dto.driverId,
            vehicleId: dto.vehicleId,
            note: dto.note,
            actor,
            source: 'PROVIDER_MANUAL',
        });
        const updated = await this.loadAssignment(assignmentId);
        await this.notifyAdmins('Transport request assigned', `${updated.provider?.name ?? 'Provider'} assigned ${updated.driver?.name ?? 'a driver'} for ${updated.tourName ?? updated.code ?? 'tour'} · ${this.formatDateTime(updated.startDate)}.`, {
            kind: 'TRANSPORT_ASSIGNED',
            assignmentId: updated.id,
            status: updated.providerRequestStatus,
            url: '/service/transport-requests',
        });
        this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
        return this.toView(updated);
    }
    async autoAssign(assignmentId, actor) {
        const assignment = await this.loadAssignment(assignmentId);
        this.assertProviderAccess(actor, assignment);
        this.assertProviderCanRespond(assignment);
        const candidates = await this.getCandidates(assignmentId, actor);
        const driverId = candidates.recommendedDriverId;
        const vehicleId = candidates.recommendedVehicleId;
        if (!driverId) {
            throw new common_1.BadRequestException('No available driver found for this trip');
        }
        if (!vehicleId) {
            throw new common_1.BadRequestException('No available vehicle found for this trip');
        }
        await this.applyAssignment(assignment, {
            providerId: assignment.providerId,
            driverId,
            vehicleId,
            note: 'Automatically assigned by the provider portal',
            actor,
            source: 'PROVIDER_AUTO',
        });
        const updated = await this.loadAssignment(assignmentId);
        await this.notifyAdmins('Transport request auto-assigned', `${updated.provider?.name ?? 'Provider'} auto-assigned ${updated.driver?.name ?? 'a driver'} for ${updated.tourName ?? updated.code ?? 'tour'} · ${this.formatDateTime(updated.startDate)}.`, {
            kind: 'TRANSPORT_ASSIGNED',
            assignmentId: updated.id,
            status: updated.providerRequestStatus,
            url: '/service/transport-requests',
        });
        this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
        return this.toView(updated);
    }
    async decline(assignmentId, dto, actor) {
        const assignment = await this.loadAssignment(assignmentId);
        this.assertProviderAccess(actor, assignment);
        this.assertProviderCanRespond(assignment);
        const updated = await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                providerRequestStatus: client_1.TransportRequestStatus.DECLINED,
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
        await this.notifyAdmins('Transport request declined', `${updated.provider?.name ?? 'Provider'} declined ${updated.tourName ?? updated.code ?? 'tour'} · ${this.formatDateTime(updated.startDate)}: ${dto.reason}`, {
            kind: 'TRANSPORT_DECLINED',
            assignmentId: updated.id,
            status: updated.providerRequestStatus,
            url: '/service/transport-requests',
        });
        this.gateway.notifyAll('transport:refresh', { assignmentId: updated.id });
        return this.toView(updated);
    }
    async getProviderSettings(actor, providerId) {
        const targetId = this.resolveProviderId(actor, providerId);
        const provider = await this.prisma.transportationProvider.findUnique({
            where: { id: targetId },
            select: { id: true, name: true, assignmentMode: true },
        });
        if (!provider)
            throw new common_1.NotFoundException('Transportation provider not found');
        return provider;
    }
    async getDriverWorkload(actor, providerId) {
        const targetId = this.resolveProviderId(actor, providerId);
        const windowStart = this.daysAgo(WORKLOAD_WINDOW_DAYS);
        const windowEnd = this.daysAhead(WORKLOAD_WINDOW_DAYS);
        const todayStart = this.startOfDay(new Date());
        const todayEnd = this.endOfDay(new Date());
        const drivers = await this.prisma.user.findMany({
            where: { role: client_1.RoleType.DRIVER, isActive: true, providerId: targetId },
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
            .sort((a, b) => a.workloadDays - b.workloadDays ||
            a.workloadTrips - b.workloadTrips ||
            b.rating - a.rating ||
            (a.name ?? '').localeCompare(b.name ?? ''));
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
    async updateProviderSettings(dto, actor) {
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
    async getSettings() {
        const rows = await this.prisma.systemSetting.findMany({
            where: { key: { in: Object.values(SETTING_KEYS) } },
        });
        const map = new Map(rows.map((r) => [r.key, r.value]));
        const sendTime = map.get(SETTING_KEYS.sendTime);
        const deadlineTime = map.get(SETTING_KEYS.deadlineTime);
        return {
            enabled: (map.get(SETTING_KEYS.enabled) ?? 'true') !== 'false',
            sendDaysBefore: this.intSetting(map.get(SETTING_KEYS.sendDaysBefore), DEFAULT_SETTINGS.sendDaysBefore, 0, 30),
            sendTime: sendTime && HHMM_PATTERN.test(sendTime)
                ? sendTime
                : DEFAULT_SETTINGS.sendTime,
            deadlineTime: deadlineTime && HHMM_PATTERN.test(deadlineTime)
                ? deadlineTime
                : DEFAULT_SETTINGS.deadlineTime,
            minLeadHours: this.intSetting(map.get(SETTING_KEYS.minLeadHours), DEFAULT_SETTINGS.minLeadHours, 0, 72),
        };
    }
    async updateSettings(dto, actor) {
        this.assertAdminOrOffice(actor);
        const current = await this.getSettings();
        const next = {
            enabled: dto.enabled ?? current.enabled,
            sendDaysBefore: dto.sendDaysBefore ?? current.sendDaysBefore,
            sendTime: dto.sendTime ?? current.sendTime,
            deadlineTime: dto.deadlineTime ?? current.deadlineTime,
            minLeadHours: dto.minLeadHours ?? current.minLeadHours,
        };
        if (!HHMM_PATTERN.test(next.sendTime) ||
            !HHMM_PATTERN.test(next.deadlineTime)) {
            throw new common_1.BadRequestException('Times must use HH:mm');
        }
        const entries = [
            [SETTING_KEYS.enabled, String(next.enabled)],
            [SETTING_KEYS.sendDaysBefore, String(next.sendDaysBefore)],
            [SETTING_KEYS.sendTime, next.sendTime],
            [SETTING_KEYS.deadlineTime, next.deadlineTime],
            [SETTING_KEYS.minLeadHours, String(next.minLeadHours)],
        ];
        await this.prisma.$transaction(entries.map(([key, value]) => this.prisma.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        })));
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
    async scheduledTick() {
        if (this.runningScheduledTick)
            return;
        this.runningScheduledTick = true;
        try {
            await this.processDueRequests();
        }
        catch (error) {
            this.logger.error(`Transport request scheduler failed: ${error.message}`);
        }
        finally {
            this.runningScheduledTick = false;
        }
    }
    async processDueRequests() {
        const settings = await this.getSettings();
        if (!settings.enabled)
            return { sent: 0, expired: 0, autoAssigned: 0 };
        const now = new Date();
        const horizon = this.daysAhead(settings.sendDaysBefore + 1);
        const assignments = await this.prisma.assignment.findMany({
            where: {
                status: {
                    in: [client_1.AssignmentStatus.DRAFT_ASSIGNED, client_1.AssignmentStatus.PENDING],
                },
                executionMode: { not: client_1.AssignmentExecutionMode.OUTSOURCED_PARTNER },
                providerId: { not: null },
                provider: { is: { isCompany: false } },
                startDate: { gt: now, lte: horizon },
                OR: [{ driverId: null }, { vehicleId: null }],
                providerRequestStatus: {
                    in: [
                        client_1.TransportRequestStatus.NOT_REQUIRED,
                        client_1.TransportRequestStatus.REQUESTED,
                        client_1.TransportRequestStatus.VIEWED,
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
        for (const assignment of assignments) {
            const sendAt = this.computeSendAt(assignment.startDate, settings);
            const deadline = this.computeDeadline(assignment.startDate, settings);
            if (assignment.providerRequestStatus === client_1.TransportRequestStatus.NOT_REQUIRED) {
                if (now.getTime() >= deadline.getTime()) {
                    await this.expire(assignment, 'Deadline passed before the request could be sent');
                    expired++;
                    continue;
                }
                if (now.getTime() >= sendAt.getTime()) {
                    await this.sendInternal(assignment, settings, deadline);
                    sent++;
                    const providerMode = assignment.provider?.assignmentMode;
                    if (providerMode === client_1.ProviderAssignmentMode.FULLY_AUTO) {
                        const didAssign = await this.tryAutoAssignInternal(assignment.id);
                        if (didAssign)
                            autoAssigned++;
                    }
                }
                continue;
            }
            if (assignment.providerRequestStatus === client_1.TransportRequestStatus.REQUESTED ||
                assignment.providerRequestStatus === client_1.TransportRequestStatus.VIEWED) {
                if (now.getTime() >= deadline.getTime()) {
                    await this.expire(assignment, 'No driver/vehicle confirmed before the deadline');
                    expired++;
                }
            }
        }
        return { sent, expired, autoAssigned };
    }
    async sendInternal(assignment, settings, deadline) {
        await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                providerRequestStatus: client_1.TransportRequestStatus.REQUESTED,
                providerRequestedAt: new Date(),
                providerRequestedById: null,
                providerDeadline: deadline,
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
            await this.notifyProvider(assignment.providerId, 'New transport request', `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} · ${assignment.totalPax} pax. ${suggestion} Deadline ${this.formatDateTime(deadline)}.`, {
                kind: 'TRANSPORT_REQUESTED',
                assignmentId: assignment.id,
                status: client_1.TransportRequestStatus.REQUESTED,
                url: '/transport-provider/requests',
            });
        }
        this.gateway.notifyAll('transport:refresh', {
            assignmentId: assignment.id,
        });
    }
    async expire(assignment, reason) {
        await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                providerRequestStatus: client_1.TransportRequestStatus.EXPIRED,
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
        await this.notifyAdmins('Transport request expired', `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} has no provider driver/vehicle. ${reason}`, {
            kind: 'TRANSPORT_EXPIRED',
            assignmentId: assignment.id,
            status: client_1.TransportRequestStatus.EXPIRED,
            url: '/service/transport-requests',
        });
        if (assignment.providerId) {
            await this.notifyProvider(assignment.providerId, 'Transport request expired', `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} expired without an assignment.`, {
                kind: 'TRANSPORT_EXPIRED',
                assignmentId: assignment.id,
                status: client_1.TransportRequestStatus.EXPIRED,
                url: '/transport-provider/requests',
            });
        }
        this.gateway.notifyAll('transport:refresh', {
            assignmentId: assignment.id,
        });
    }
    async tryAutoAssignInternal(assignmentId) {
        const assignment = await this.loadAssignment(assignmentId);
        if (!assignment.providerId)
            return false;
        const start = this.startOfDay(assignment.startDate);
        const end = this.endOfDay(assignment.endDate);
        const drivers = await this.prisma.user.findMany({
            where: {
                role: client_1.RoleType.DRIVER,
                isActive: true,
                providerId: assignment.providerId,
            },
            select: { id: true },
        });
        const driverIds = drivers.map((d) => d.id);
        const [busyDrivers, workload, leaves] = await Promise.all([
            this.busyDriverIds(driverIds, start, end, assignment.id),
            this.driverWorkload(driverIds, this.daysAgo(WORKLOAD_WINDOW_DAYS), this.daysAhead(WORKLOAD_WINDOW_DAYS), assignment.id),
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
        if (!driverId)
            return false;
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
        const busyVehicles = await this.busyVehicleIds(vehicles.map((v) => v.id), start, end, assignment.id);
        const vehicleId = vehicles.find((v) => !busyVehicles.has(v.id))?.id;
        if (!vehicleId)
            return false;
        await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                driverId,
                vehicleId,
                providerRequestStatus: client_1.TransportRequestStatus.ASSIGNED,
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
        await this.notifyAdmins('Transport request auto-assigned', `${assignment.provider?.name ?? 'Provider'} auto-assigned ${assignment.tourName ?? assignment.code ?? 'tour'} · ${this.formatDateTime(assignment.startDate)}.`, {
            kind: 'TRANSPORT_ASSIGNED',
            assignmentId: assignment.id,
            status: client_1.TransportRequestStatus.ASSIGNED,
            url: '/service/transport-requests',
        });
        this.gateway.notifyAll('transport:refresh', {
            assignmentId: assignment.id,
        });
        return true;
    }
    async applyAssignment(assignment, input) {
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
        if (!driver)
            throw new common_1.NotFoundException('Driver not found');
        if (driver.role !== client_1.RoleType.DRIVER) {
            throw new common_1.BadRequestException('Only DRIVER accounts can be assigned');
        }
        if (!driver.isActive)
            throw new common_1.BadRequestException('This driver is inactive');
        if (driver.providerId !== input.providerId) {
            throw new common_1.BadRequestException('This driver does not belong to the selected provider');
        }
        const start = this.startOfDay(assignment.startDate);
        const end = this.endOfDay(assignment.endDate);
        if (await this.leaves.hasLeaveConflict(driver.id, start, end)) {
            throw new common_1.BadRequestException('This driver is on leave during the trip dates');
        }
        const busyDrivers = await this.busyDriverIds([driver.id], start, end, assignment.id);
        if (busyDrivers.has(driver.id)) {
            throw new common_1.BadRequestException('This driver is already assigned to another trip on these dates');
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
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found');
        if (vehicle.providerId !== input.providerId) {
            throw new common_1.BadRequestException('This vehicle does not belong to the selected provider');
        }
        if (assignment.totalPax && (vehicle.capacity ?? 0) < assignment.totalPax) {
            throw new common_1.BadRequestException(`Vehicle ${vehicle.plateNumber} seats ${vehicle.capacity ?? 0}, but the trip has ${assignment.totalPax} pax`);
        }
        const busyVehicles = await this.busyVehicleIds([vehicle.id], start, end, assignment.id);
        if (busyVehicles.has(vehicle.id)) {
            throw new common_1.BadRequestException('This vehicle is already assigned to another trip on these dates');
        }
        const vehicleId = vehicle.id;
        await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                providerId: input.providerId,
                driverId: driver.id,
                vehicleId,
                providerRequestStatus: client_1.TransportRequestStatus.ASSIGNED,
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
        await this.notifyCrewAssigned(assignment, driver.id, driver.name ?? 'Driver', vehicle.plateNumber ?? 'vehicle');
    }
    async notifyCrewAssigned(assignment, driverId, driverName, vehiclePlate) {
        const recipients = [driverId, assignment.guideId].filter((id) => Boolean(id));
        if (recipients.length === 0)
            return;
        const crew = [
            assignment.guide?.name ? `Guide: ${assignment.guide.name}` : null,
            `Driver: ${driverName}`,
            `Vehicle: ${vehiclePlate}`,
        ]
            .filter(Boolean)
            .join(' · ');
        await this.notifyUsers(recipients, 'Tour assignment confirmed', `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} · ${crew}.`, {
            kind: 'TRANSPORT_ASSIGNED',
            assignmentId: assignment.id,
            status: client_1.TransportRequestStatus.ASSIGNED,
        });
    }
    async notifyUsers(userIds, title, body, data) {
        for (const userId of [...new Set(userIds)]) {
            const notification = await this.notificationService.create(userId, client_1.NotificationType.GENERAL, title, body, data);
            this.gateway.notifyUser(userId, 'notification', notification);
        }
    }
    async loadAssignment(id) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id },
            include: this.include,
        });
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        return assignment;
    }
    assertRequestable(assignment) {
        if (assignment.executionMode === client_1.AssignmentExecutionMode.OUTSOURCED_PARTNER) {
            throw new common_1.BadRequestException('Outsourced partner trips do not use transport requests');
        }
        if (assignment.status === client_1.AssignmentStatus.CANCELED ||
            assignment.status === client_1.AssignmentStatus.COMPLETED) {
            throw new common_1.BadRequestException('This trip is closed');
        }
    }
    assertProviderCanRespond(assignment) {
        if (assignment.providerRequestStatus !== client_1.TransportRequestStatus.REQUESTED &&
            assignment.providerRequestStatus !== client_1.TransportRequestStatus.VIEWED) {
            throw new common_1.BadRequestException('This transport request is not open for a response');
        }
        if (assignment.providerDeadline &&
            assignment.providerDeadline.getTime() < Date.now()) {
            throw new common_1.BadRequestException('The response deadline has passed');
        }
    }
    async assertChangeWindowOpen(assignment) {
        const row = await this.prisma.systemSetting.findUnique({
            where: { key: RECALL_CUTOFF_KEY },
        });
        const time = row?.value && HHMM_PATTERN.test(row.value)
            ? row.value
            : DEFAULT_RECALL_CUTOFF;
        const [hours, minutes] = time.split(':').map(Number);
        const cutoff = new Date(assignment.startDate);
        cutoff.setHours(hours, minutes, 0, 0);
        if (Date.now() > cutoff.getTime()) {
            throw new common_1.BadRequestException(`Driver/vehicle changes are locked after ${time} on the departure day for "${assignment.code ?? 'Bus'}"`);
        }
    }
    isAdminOrOffice(actor) {
        return actor.role === client_1.RoleType.ADMIN || actor.role === client_1.RoleType.OFFICE;
    }
    isProvider(actor) {
        return actor.role === client_1.RoleType.TRANSPORT_PROVIDER;
    }
    assertAdminOrOffice(actor) {
        if (!this.isAdminOrOffice(actor)) {
            throw new common_1.ForbiddenException('Only Admin or Office can manage transport requests');
        }
    }
    assertProviderAccess(actor, assignment) {
        if (this.isAdminOrOffice(actor))
            return;
        if (!this.isProvider(actor)) {
            throw new common_1.ForbiddenException('Only the transportation provider can respond to this request');
        }
        if (!actor.providerId || assignment.providerId !== actor.providerId) {
            throw new common_1.ForbiddenException('This transport request belongs to another provider');
        }
    }
    resolveProviderId(actor, providerId) {
        if (this.isProvider(actor)) {
            if (!actor.providerId) {
                throw new common_1.ForbiddenException('Your account is not linked to a transportation provider');
            }
            return actor.providerId;
        }
        if (!this.isAdminOrOffice(actor)) {
            throw new common_1.ForbiddenException('Only Admin, Office or Transport Provider can change this setting');
        }
        if (!providerId) {
            throw new common_1.BadRequestException('providerId is required');
        }
        return providerId;
    }
    toView(a) {
        const booking = a.bookings?.[0];
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
            pickups: a.pickupInfo ?? [],
            providerRequestStatus: a.providerRequestStatus,
            providerRequestedAt: a.providerRequestedAt,
            providerViewedAt: a.providerViewedAt,
            providerRespondedAt: a.providerRespondedAt,
            providerDeadline: a.providerDeadline,
            providerRequestNote: a.providerRequestNote,
            providerResponseNote: a.providerResponseNote,
            providerDeclineReason: a.providerDeclineReason,
            providerAssignmentMode: a.provider?.assignmentMode ?? null,
        };
    }
    async notifyProvider(providerId, title, body, data) {
        const users = await this.prisma.user.findMany({
            where: {
                role: client_1.RoleType.TRANSPORT_PROVIDER,
                providerId,
                isActive: true,
            },
            select: { id: true },
        });
        for (const user of users) {
            const notification = await this.notificationService.create(user.id, client_1.NotificationType.GENERAL, title, body, data);
            this.gateway.notifyUser(user.id, 'notification', notification);
        }
    }
    async notifyAdmins(title, body, data) {
        const users = await this.prisma.user.findMany({
            where: {
                role: { in: [client_1.RoleType.ADMIN, client_1.RoleType.OFFICE] },
                isActive: true,
            },
            select: { id: true },
        });
        for (const user of users) {
            const notification = await this.notificationService.create(user.id, client_1.NotificationType.GENERAL, title, body, data);
            this.gateway.notifyUser(user.id, 'notification', notification);
        }
    }
    async busyDriverIds(driverIds, start, end, excludeAssignmentId) {
        if (!driverIds.length)
            return new Set();
        const rows = await this.prisma.assignment.findMany({
            where: {
                id: { not: excludeAssignmentId },
                status: { not: client_1.AssignmentStatus.CANCELED },
                driverId: { in: driverIds },
                startDate: { lte: end },
                endDate: { gte: start },
            },
            select: { driverId: true },
        });
        return new Set(rows.map((r) => r.driverId).filter((x) => !!x));
    }
    async busyVehicleIds(vehicleIds, start, end, excludeAssignmentId) {
        if (!vehicleIds.length)
            return new Set();
        const rows = await this.prisma.assignment.findMany({
            where: {
                id: { not: excludeAssignmentId },
                status: { not: client_1.AssignmentStatus.CANCELED },
                vehicleId: { in: vehicleIds },
                startDate: { lte: end },
                endDate: { gte: start },
            },
            select: { vehicleId: true },
        });
        return new Set(rows.map((r) => r.vehicleId).filter((x) => !!x));
    }
    async driverWorkload(driverIds, windowStart, windowEnd, excludeAssignmentId) {
        const map = new Map();
        if (!driverIds.length)
            return map;
        const rows = await this.prisma.assignment.findMany({
            where: {
                id: { not: excludeAssignmentId },
                status: { not: client_1.AssignmentStatus.CANCELED },
                driverId: { in: driverIds },
                startDate: { lte: windowEnd },
                endDate: { gte: windowStart },
            },
            select: { driverId: true, startDate: true, endDate: true },
        });
        for (const row of rows) {
            if (!row.driverId)
                continue;
            const current = map.get(row.driverId) ?? { days: 0, trips: 0 };
            const start = Math.max(this.startOfDay(row.startDate).getTime(), windowStart.getTime());
            const end = Math.min(this.endOfDay(row.endDate).getTime(), windowEnd.getTime());
            current.days += Math.max(1, Math.floor((end - start) / DAY_MS) + 1);
            current.trips += 1;
            map.set(row.driverId, current);
        }
        return map;
    }
    async leaveMap(driverIds, start, end) {
        const result = new Set();
        for (const id of driverIds) {
            if (await this.leaves.hasLeaveConflict(id, start, end))
                result.add(id);
        }
        return result;
    }
    computeSendAt(startDate, settings) {
        return this.hcmDateTime(startDate, -settings.sendDaysBefore, settings.sendTime);
    }
    computeDeadline(startDate, settings) {
        const dayBefore = this.hcmDateTime(startDate, -1, settings.deadlineTime);
        const latest = new Date(startDate.getTime() - settings.minLeadHours * 60 * 60 * 1000);
        return new Date(Math.min(dayBefore.getTime(), latest.getTime()));
    }
    hcmDateTime(date, dayOffset, time) {
        const shifted = new Date(date.getTime() + HCM_OFFSET_MINUTES * 60 * 1000);
        const year = shifted.getUTCFullYear();
        const month = shifted.getUTCMonth();
        const day = shifted.getUTCDate();
        const [hours, minutes] = time.split(':').map(Number);
        return new Date(Date.UTC(year, month, day + dayOffset, hours, minutes) -
            HCM_OFFSET_MINUTES * 60 * 1000);
    }
    startOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    endOfDay(date) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    daysAgo(days) {
        const d = this.startOfDay(new Date());
        d.setDate(d.getDate() - days);
        return d;
    }
    daysAhead(days) {
        const d = this.endOfDay(new Date());
        d.setDate(d.getDate() + days);
        return d;
    }
    intSetting(value, fallback, min, max) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed))
            return fallback;
        return Math.min(max, Math.max(min, Math.trunc(parsed)));
    }
    formatDateTime(value) {
        if (!value)
            return '—';
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
};
exports.TransportRequestsService = TransportRequestsService;
__decorate([
    (0, schedule_1.Cron)('*/10 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TransportRequestsService.prototype, "scheduledTick", null);
exports.TransportRequestsService = TransportRequestsService = TransportRequestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        leaves_service_1.LeavesService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway])
], TransportRequestsService);
//# sourceMappingURL=transport-requests.service.js.map