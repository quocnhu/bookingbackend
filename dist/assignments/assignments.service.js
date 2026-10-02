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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const assignment_board_service_1 = require("../queues/assignment-board.service");
const notification_service_1 = require("../notifications/notification.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const leaves_service_1 = require("../leaves/leaves.service");
const storage_1 = require("../storage");
const BOARD_LOOKBACK_DAYS = 30;
let AssignmentsService = class AssignmentsService {
    prisma;
    auditService;
    board;
    notificationService;
    gateway;
    leavesService;
    storage;
    constructor(prisma, auditService, board, notificationService, gateway, leavesService, storage) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.board = board;
        this.notificationService = notificationService;
        this.gateway = gateway;
        this.leavesService = leavesService;
        this.storage = storage;
    }
    include = {
        bookings: {
            orderBy: { paxSequence: 'asc' },
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
        paymentLines: {
            select: {
                id: true,
                tourDate: true,
                periodId: true,
                payableTo: { select: { id: true, name: true } },
            },
        },
    };
    async findBoard(actor) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const maxDate = new Date(startOfToday);
        maxDate.setDate(maxDate.getDate() + 90);
        const minDate = new Date(startOfToday);
        minDate.setDate(minDate.getDate() - BOARD_LOOKBACK_DAYS);
        const where = {
            startDate: { lte: maxDate },
            endDate: { gte: minDate },
        };
        if (actor.role !== client_1.RoleType.ADMIN && actor.role !== client_1.RoleType.OFFICE) {
            if (actor.role === client_1.RoleType.TRANSPORT_PROVIDER) {
                where.providerId = actor.providerId;
            }
            else {
                where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
            }
        }
        const items = await this.prisma.assignment.findMany({
            where,
            include: this.include,
            orderBy: [{ startDate: 'asc' }],
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
    async getBoardCrew() {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const active = await this.prisma.assignment.findMany({
            where: {
                status: {
                    in: [
                        client_1.AssignmentStatus.PENDING,
                        client_1.AssignmentStatus.DISPATCHED,
                        client_1.AssignmentStatus.VERIFYING,
                    ],
                },
                startDate: { gte: startOfToday },
            },
            select: { guideId: true, driverId: true },
        });
        const busyGuides = new Set(active.map((a) => a.guideId).filter((x) => !!x));
        const busyDrivers = new Set(active.map((a) => a.driverId).filter((x) => !!x));
        const leaveMap = await this.fetchLeaveMap();
        const users = await this.prisma.user.findMany({
            where: {
                isActive: true,
                role: { in: [client_1.RoleType.TOUR_GUIDE, client_1.RoleType.DRIVER] },
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
            .filter((u) => u.role === client_1.RoleType.TOUR_GUIDE)
            .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            type: u.guideProfile?.type ?? client_1.GuideType.FREELANCE,
            languages: u.guideProfile?.languages ?? [],
            rating: u.guideProfile?.rating ?? null,
            isBusy: busyGuides.has(u.id),
            leaves: leaveMap.get(u.id) ?? [],
        }));
        const drivers = users
            .filter((u) => u.role === client_1.RoleType.DRIVER)
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
    async fetchLeaveMap() {
        const leaves = await this.prisma.userLeave.findMany({
            where: { status: { in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.APPROVED] } },
            select: {
                id: true,
                userId: true,
                startDate: true,
                endDate: true,
                status: true,
            },
            orderBy: { startDate: 'asc' },
        });
        const map = new Map();
        for (const l of leaves) {
            const arr = map.get(l.userId) ?? [];
            arr.push(l);
            map.set(l.userId, arr);
        }
        return map;
    }
    async getCrewAvailability(from, to) {
        const maxSpan = new Date(from);
        maxSpan.setDate(maxSpan.getDate() + 90);
        const effectiveTo = to > maxSpan ? maxSpan : to;
        const assignments = await this.prisma.assignment.findMany({
            where: {
                status: { not: client_1.AssignmentStatus.CANCELED },
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
            },
            orderBy: { startDate: 'asc' },
        });
        const byGuide = new Map();
        const byDriver = new Map();
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
                role: { in: [client_1.RoleType.TOUR_GUIDE, client_1.RoleType.DRIVER] },
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
        const toMember = (a) => ({
            id: a.id,
            code: a.code,
            tourName: a.tourName,
            status: a.status,
            startDate: a.startDate,
            endDate: a.endDate,
        });
        const leaveMap = await this.fetchLeaveMap();
        const guides = users
            .filter((u) => u.role === client_1.RoleType.TOUR_GUIDE)
            .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            type: u.guideProfile?.type ?? client_1.GuideType.FREELANCE,
            rating: u.guideProfile?.rating ?? null,
            assignments: (byGuide.get(u.id) ?? []).map(toMember),
            leaves: leaveMap.get(u.id) ?? [],
        }));
        const drivers = users
            .filter((u) => u.role === client_1.RoleType.DRIVER)
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
    async dispatchAllBoard() {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setHours(23, 59, 59, 999);
        const items = await this.prisma.assignment.findMany({
            where: {
                status: client_1.AssignmentStatus.PENDING,
                startDate: { lte: endOfToday },
                endDate: { gte: startOfToday },
            },
            select: { id: true },
        });
        if (items.length === 0)
            return { dispatched: 0 };
        const ids = items.map((a) => a.id);
        await this.prisma.$transaction([
            this.prisma.assignment.updateMany({
                where: { id: { in: ids } },
                data: { status: client_1.AssignmentStatus.DISPATCHED },
            }),
            this.prisma.booking.updateMany({
                where: { assignmentId: { in: ids }, status: client_1.BookingStatus.PENDING },
                data: { status: client_1.BookingStatus.ASSIGNED },
            }),
        ]);
        await this.auditService.log({
            entityType: 'Assignment',
            entityId: items.map((a) => a.id).join(','),
            action: 'DISPATCH_ALL',
            afterData: { count: items.length },
        });
        return { dispatched: items.length };
    }
    async setBoardOrigin(origin) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const result = await this.prisma.assignment.updateMany({
            where: {
                status: { not: client_1.AssignmentStatus.CANCELED },
                startDate: { gte: startOfToday },
            },
            data: { origin },
        });
        return { updated: result.count };
    }
    async assertCrewAvailableForDates(guideId, driverId, startDate, endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        for (const [label, userId] of [
            ['guide', guideId],
            ['driver', driverId],
        ]) {
            if (!userId)
                continue;
            const onLeave = await this.leavesService.hasLeaveConflict(userId, start, end);
            if (onLeave) {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { name: true, email: true },
                });
                const who = user?.name ?? user?.email ?? userId;
                throw new common_1.BadRequestException(`${who} is on leave during this date range and cannot be assigned as ${label}.`);
            }
        }
    }
    async assertProviderOwnsAssignment(actor, dto) {
        if ((dto.providerId ?? null) !== actor.providerId) {
            throw new common_1.ForbiddenException('Cannot create an assignment for another provider');
        }
        if (dto.vehicleId) {
            const v = await this.prisma.vehicle.findUnique({
                where: { id: dto.vehicleId },
            });
            if (!v || v.providerId !== actor.providerId) {
                throw new common_1.ForbiddenException('Vehicle does not belong to your provider');
            }
        }
        if (dto.driverId) {
            const drv = await this.prisma.user.findUnique({
                where: { id: dto.driverId },
            });
            if (!drv || drv.providerId !== actor.providerId) {
                throw new common_1.ForbiddenException('Driver does not belong to your provider');
            }
        }
    }
    async resolvePriceOverride(dto) {
        const provId = dto.providerId ?? null;
        let isCompany = false;
        if (provId) {
            const p = await this.prisma.transportationProvider.findUnique({
                where: { id: provId },
                select: { isCompany: true },
            });
            isCompany = p?.isCompany ?? false;
        }
        else if (dto.vehicleId) {
            const v = await this.prisma.vehicle.findUnique({
                where: { id: dto.vehicleId },
                select: { provider: { select: { isCompany: true } } },
            });
            isCompany = v?.provider?.isCompany ?? false;
        }
        return isCompany ? 0 : (dto.priceOverride ?? null);
    }
    decorateBoardCard(a) {
        const totalPax = a.totalPax ??
            a.bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
        const type = a.tourType ?? a.bookings.find((b) => b.tourType)?.tourType ?? null;
        const tourName = a.tourName ??
            a.bookings.find((b) => b.tourName)?.tourName ??
            a.code ??
            'Tour';
        const durationDays = a.durationDays ??
            (a.endDate && a.startDate
                ? Math.max(1, Math.round((a.endDate.getTime() - a.startDate.getTime()) / 86400000) + 1)
                : 1);
        const pickups = Array.isArray(a.pickupInfo)
            ? a.pickupInfo
            : a.bookings
                .filter((b) => b.hotelName || b.address)
                .map((b) => ({
                bookingRef: b.bookingRef,
                customerName: b.customerName,
                pickup: b.hotelName || b.address,
                totalPax: b.totalPax ?? 0,
            }));
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
    async findAll(query, actor) {
        const { page, limit, status, vehicleId, driverId, guideId, sortOrder } = query;
        const where = {};
        if (status)
            where.status = status;
        if (vehicleId)
            where.vehicleId = vehicleId;
        if (driverId)
            where.driverId = driverId;
        if (guideId)
            where.guideId = guideId;
        if (actor.role !== client_1.RoleType.ADMIN && actor.role !== client_1.RoleType.OFFICE) {
            if (actor.role === client_1.RoleType.TRANSPORT_PROVIDER) {
                where.providerId = actor.providerId;
            }
            else {
                where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
            }
        }
        const [items, total] = await Promise.all([
            this.prisma.assignment.findMany({
                where,
                include: this.include,
                orderBy: [{ startDate: sortOrder ?? 'asc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.assignment.count({ where }),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id },
            include: this.include,
        });
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        return assignment;
    }
    async create(dto, actor) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        await this.assertCrewAvailableForDates(dto.guideId, dto.driverId, startDate, endDate);
        if (actor?.role === client_1.RoleType.TRANSPORT_PROVIDER) {
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
    async update(id, dto) {
        const before = await this.findOne(id);
        const startDate = dto.startDate
            ? new Date(dto.startDate)
            : before.startDate;
        const endDate = dto.endDate ? new Date(dto.endDate) : before.endDate;
        if (dto.guideId !== undefined || dto.driverId !== undefined) {
            await this.assertCrewAvailableForDates(dto.guideId !== undefined ? dto.guideId : before.guideId, dto.driverId !== undefined ? dto.driverId : before.driverId, startDate, endDate);
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
                    providerId: dto.providerId !== undefined ? dto.providerId : before.providerId,
                    vehicleId: dto.vehicleId !== undefined ? dto.vehicleId : before.vehicleId,
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
    assertDispatchableToday(assignment) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setHours(23, 59, 59, 999);
        const start = new Date(assignment.startDate);
        const end = new Date(assignment.endDate ?? assignment.startDate);
        if (start.getTime() > endOfToday.getTime() ||
            end.getTime() < startOfToday.getTime()) {
            const label = `${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()}`;
            throw new common_1.BadRequestException(`Cannot dispatch "${assignment.code ?? 'Bus'}" (starts ${label}) — only tours active today can be dispatched. Future departures must wait until their tour day.`);
        }
    }
    assertRecallAllowed(assignment) {
        const cutoff = new Date(assignment.startDate);
        cutoff.setHours(5, 0, 0, 0);
        if (Date.now() > cutoff.getTime()) {
            throw new common_1.BadRequestException(`Recall locked — the 05:00 cutoff has passed for "${assignment.code ?? 'Bus'}". The tour is considered departed; cancel it instead if needed.`);
        }
    }
    async updateStatus(id, dto) {
        const before = await this.findOne(id);
        if (dto.status === before.status)
            return before;
        if (dto.status === client_1.AssignmentStatus.DISPATCHED) {
            this.assertDispatchableToday(before);
        }
        if (before.status === client_1.AssignmentStatus.DISPATCHED &&
            dto.status === client_1.AssignmentStatus.PENDING) {
            this.assertRecallAllowed(before);
        }
        if (dto.status === client_1.AssignmentStatus.COMPLETED) {
            const report = await this.prisma.tourReport.findUnique({
                where: { assignmentId: id },
            });
            if (!report || report.status !== 'VERIFIED') {
                throw new common_1.BadRequestException('Cannot mark COMPLETED without a verified tour report. Guide must submit → Admin verifies → Then mark COMPLETED.');
            }
        }
        if (dto.status === client_1.AssignmentStatus.DISPATCHED) {
            await this.prisma.booking.updateMany({
                where: { assignmentId: id, status: client_1.BookingStatus.PENDING },
                data: { status: client_1.BookingStatus.ASSIGNED },
            });
        }
        else if (dto.status === client_1.AssignmentStatus.CANCELED) {
            await this.prisma.booking.updateMany({
                where: { assignmentId: id, status: client_1.BookingStatus.ASSIGNED },
                data: { status: client_1.BookingStatus.PENDING, assignmentId: null },
            });
        }
        const assignment = await this.prisma.assignment.update({
            where: { id },
            data: { status: dto.status },
            include: this.include,
        });
        const affectedUserIds = [assignment.driverId, assignment.guideId].filter(Boolean);
        const notifResult = await this.sendStatusNotifications(assignment, before.status, dto.status);
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
    async sendStatusNotifications(assignment, fromStatus, toStatus) {
        const code = assignment.code ?? 'Bus';
        const tour = assignment.tourName ?? '';
        const affectedUserIds = [assignment.driverId, assignment.guideId].filter(Boolean);
        const result = [];
        for (const userId of affectedUserIds) {
            let type;
            let title;
            let body;
            switch (toStatus) {
                case client_1.AssignmentStatus.DISPATCHED:
                    type = client_1.NotificationType.ASSIGNED;
                    title = `🚌 ${code} departed`;
                    body = `Trip ${tour} has started. Please board the bus.`;
                    break;
                case client_1.AssignmentStatus.TRANSFERRED:
                    type = client_1.NotificationType.TRANSFERRED;
                    title = `🔄 ${code} — Changed`;
                    body = `Trip ${tour} has a new bus/seat. Check the new pickup schedule.`;
                    break;
                case client_1.AssignmentStatus.VERIFYING:
                    type = client_1.NotificationType.GENERAL;
                    title = `⏳ ${code} — Awaiting verification`;
                    body = `Trip report for ${tour} has been submitted. Waiting for Admin verification.`;
                    break;
                case client_1.AssignmentStatus.CANCELED:
                    type = client_1.NotificationType.CANCELED;
                    title = `❌ ${code} — Canceled`;
                    body = `Trip ${tour} has been canceled. Passengers were removed from the schedule.`;
                    break;
                case client_1.AssignmentStatus.COMPLETED:
                    type = client_1.NotificationType.GENERAL;
                    title = `✅ ${code} — Completed`;
                    body = `Trip ${tour} has ended.`;
                    break;
                case client_1.AssignmentStatus.DRAFT_ASSIGNED:
                    type = client_1.NotificationType.ASSIGNED;
                    title = `📋 ${code} — Draft assigned`;
                    body = `Trip ${tour} has been assigned a bus. Waiting for confirmation.`;
                    break;
                default:
                    type = client_1.NotificationType.GENERAL;
                    title = `${code} — Status updated`;
                    body = `Status changed: ${fromStatus} → ${toStatus}`;
            }
            const notif = await this.notificationService.create(userId, type, title, body, {
                assignmentId: assignment.id,
                fromStatus,
                toStatus,
            });
            result.push(notif);
            this.gateway.notifyUser(userId, 'notification', notif);
        }
        return result;
    }
    async assignBookings(id, dto) {
        const assignment = await this.findOne(id);
        const bookingsToAssign = await this.prisma.booking.findMany({
            where: { id: { in: dto.bookingIds } },
            select: { id: true, assignmentId: true, startingDate: true, tour: { select: { durationDays: true, name: true } } },
        });
        const busy = bookingsToAssign.find((b) => b.assignmentId && b.assignmentId !== id);
        if (busy) {
            throw new common_1.BadRequestException(`Booking ${busy.id} is already assigned to another assignment`);
        }
        const tourNames = [...new Set(bookingsToAssign.map((b) => b.tour?.name).filter((n) => !!n))];
        if (tourNames.length > 1) {
            throw new common_1.BadRequestException(`Cannot assign bookings with different tours to the same assignment. Tours: ${tourNames.join(', ')}`);
        }
        const uniqueStartDates = [...new Set(bookingsToAssign.map((b) => b.startingDate?.toISOString().split('T')[0]).filter((d) => !!d))];
        if (uniqueStartDates.length > 1) {
            throw new common_1.BadRequestException(`Cannot assign bookings with different dates to the same assignment. Dates: ${uniqueStartDates.join(', ')}`);
        }
        const maxSeq = await this.prisma.booking.aggregate({
            where: { assignmentId: id },
            _max: { paxSequence: true },
        });
        await this.prisma.$transaction(bookingsToAssign.map((booking, i) => this.prisma.booking.update({
            where: { id: booking.id },
            data: {
                assignmentId: id,
                paxSequence: (maxSeq._max.paxSequence ?? 0) + i + 1,
                status: client_1.BookingStatus.ASSIGNED,
            },
        })));
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
    async removeBooking(id, bookingId) {
        await this.findOne(id);
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking || booking.assignmentId !== id) {
            throw new common_1.NotFoundException('Booking not in this assignment');
        }
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                assignmentId: null,
                paxSequence: 0,
                status: client_1.BookingStatus.PENDING,
            },
        });
        await this.refreshSummary(id);
        this.gateway.notifyAll('board:refresh', { assignmentId: id, action: 'remove_booking' });
        return this.findOne(id);
    }
    async reorderBookings(id, bookingIds) {
        const result = await this.board.reorder(id, bookingIds);
        if (result.error)
            throw new common_1.BadRequestException(result.error);
        this.gateway.notifyAll('board:refresh', { assignmentId: id, action: 'reorder' });
        return this.findOne(id);
    }
    async moveBooking(fromAssignmentId, bookingId, toAssignmentId) {
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
            throw new common_1.BadRequestException(`Cannot move booking to a bus with a different tour. Booking tour: ${booking.tour.name}, Target bus tour: ${toAssignment.tourName}`);
        }
        const result = await this.board.move(fromAssignmentId, bookingId, toAssignmentId);
        if (result.error)
            throw new common_1.BadRequestException(result.error);
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { movedFromBusId: fromAssignmentId },
        });
        await this.notifyMoveBooking(fromAssignmentId, toAssignmentId, bookingId);
        this.gateway.notifyAll('board:refresh', { assignmentId: fromAssignmentId, action: 'move_out' });
        this.gateway.notifyAll('board:refresh', { assignmentId: toAssignmentId, action: 'move_in' });
        return this.findOne(toAssignmentId);
    }
    async notifyMoveBooking(fromAssignmentId, toAssignmentId, bookingId) {
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
        const recipients = [
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
            if (!r.id)
                continue;
            const notif = await this.notificationService.create(r.id, client_1.NotificationType.TRANSFERRED, `🔄 ${to?.code ?? 'Bus'} — Passenger changed`, r.body, { bookingId, fromAssignmentId, toAssignmentId });
            this.gateway.notifyUser(r.id, 'notification', notif);
        }
    }
    async refreshSummary(assignmentId) {
        const bookings = await this.prisma.booking.findMany({
            where: { assignmentId },
            include: {
                tour: { select: { durationDays: true, type: true, name: true } },
            },
        });
        for (const b of bookings) {
            if (b.latitude != null && b.longitude != null)
                continue;
            const key = b.hotelName ?? b.address;
            if (!key)
                continue;
            const match = await this.prisma.coordinate.findFirst({
                where: {
                    OR: [
                        { hotelName: { equals: key, mode: 'insensitive' } },
                        { address: { equals: key, mode: 'insensitive' } },
                    ],
                },
            });
            if (!match)
                continue;
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
        const tourName = bookings.find((b) => b.tourName)?.tourName ??
            first?.tour?.name ??
            undefined;
        const tourType = bookings.find((b) => b.tourType)?.tourType ??
            first?.tour?.type ??
            undefined;
        const durationDays = first?.tour?.durationDays ?? 1;
        const totalPax = bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
        const activeBookings = bookings.filter((b) => b.status !== client_1.BookingStatus.CANCELED);
        if (activeBookings.length === 0 && bookings.length > 0) {
            await this.prisma.assignment.update({
                where: { id: assignmentId },
                data: { status: client_1.AssignmentStatus.CANCELED },
            });
            this.gateway.notifyAll('board:refresh', { assignmentId, action: 'auto_cancel' });
            return;
        }
        const geo = bookings.filter((b) => b.latitude != null && b.longitude != null);
        const latitude = geo.length > 0
            ? geo.reduce((s, b) => s + b.latitude, 0) / geo.length
            : null;
        const longitude = geo.length > 0
            ? geo.reduce((s, b) => s + b.longitude, 0) / geo.length
            : null;
        await this.prisma.assignment.update({
            where: { id: assignmentId },
            data: { tourName, tourType, durationDays, totalPax, latitude, longitude },
        });
    }
    async syncDatesFromBookings(assignmentId) {
        const assignment = await this.findOne(assignmentId);
        const bookings = await this.prisma.booking.findMany({
            where: { assignmentId },
            select: { startingDate: true, tour: { select: { durationDays: true } } },
        });
        if (bookings.length === 0) {
            throw new common_1.BadRequestException('Assignment has no bookings to sync dates from');
        }
        const dates = bookings
            .map((b) => b.startingDate?.toISOString().split('T')[0])
            .filter((d) => !!d);
        if (dates.length === 0) {
            throw new common_1.BadRequestException('No bookings with valid startingDate');
        }
        const counts = dates.reduce((acc, d) => {
            acc[d] = (acc[d] ?? 0) + 1;
            return acc;
        }, {});
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
    async submitTourReport(id, dto, actor) {
        const assignment = await this.findOne(id);
        if (assignment.status === client_1.AssignmentStatus.COMPLETED) {
            throw new common_1.BadRequestException('Tour already completed');
        }
        if (assignment.status === client_1.AssignmentStatus.CANCELED) {
            throw new common_1.BadRequestException('Canceled assignment cannot submit a report');
        }
        if (actor.role !== client_1.RoleType.ADMIN &&
            actor.role !== client_1.RoleType.OFFICE &&
            assignment.guideId !== actor.id) {
            throw new common_1.BadRequestException('Only the assigned tour guide or office staff can submit the tour report');
        }
        const latest = await this.prisma.tourReport.findUnique({
            where: { assignmentId: id },
        });
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
                        : [])),
                verifiedById: null,
                verifiedByName: null,
                verifiedAt: null,
                verificationNotes: null,
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
                evidenceImages: (dto.evidenceImages ?? []),
            },
        });
        if (assignment.status === client_1.AssignmentStatus.DISPATCHED) {
            await this.prisma.assignment.update({
                where: { id },
                data: { status: client_1.AssignmentStatus.VERIFYING },
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
    async uploadReportImage(id, file, actor) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        const assignment = await this.findOne(id);
        if (assignment.status === client_1.AssignmentStatus.COMPLETED) {
            throw new common_1.BadRequestException('Tour already completed');
        }
        if (assignment.status === client_1.AssignmentStatus.CANCELED) {
            throw new common_1.BadRequestException('Canceled assignment cannot upload evidence');
        }
        if (actor.role !== client_1.RoleType.ADMIN &&
            actor.role !== client_1.RoleType.OFFICE &&
            assignment.guideId !== actor.id) {
            throw new common_1.BadRequestException('Only the assigned tour guide or office staff can upload evidence');
        }
        const guide = assignment.guide;
        const slug = this.userSlug(guide?.email, guide?.name, assignment.guideId ?? 'tourguide');
        const guideDir = `${slug}_${assignment.guideId ?? 'guide'}`;
        const dateKey = assignment.startDate.toISOString().slice(0, 10);
        const ext = (file.originalname.split('.').pop() || '').toLowerCase();
        const safeName = (file.originalname.split('/').pop() || 'file').replace(/[^\w.\- ]/g, '_');
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
    userSlug(email, name, fallback) {
        const raw = email?.split('@')[0] || name || fallback || 'user';
        const slug = raw
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        return slug || fallback || 'user';
    }
    async verifyTourReport(id, dto, actor) {
        if (actor.role !== client_1.RoleType.ADMIN && actor.role !== client_1.RoleType.OFFICE) {
            throw new common_1.BadRequestException('Only management (ADMIN/OFFICE) can verify tour reports');
        }
        const assignment = await this.findOne(id);
        const report = await this.prisma.tourReport.findUnique({
            where: { assignmentId: id },
        });
        if (!report) {
            throw new common_1.NotFoundException('No tour report submitted for this assignment');
        }
        if (report.status === 'VERIFIED') {
            throw new common_1.BadRequestException('Tour report already verified');
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
        if (dto.status === 'REJECTED') {
            await this.prisma.assignment.update({
                where: { id },
                data: { reportVerifierId: null },
            });
        }
        if (assignment.guideId) {
            const isVerified = dto.status === 'VERIFIED';
            const notifType = isVerified
                ? client_1.NotificationType.REPORT_VERIFIED
                : client_1.NotificationType.REPORT_REJECTED;
            const title = isVerified
                ? `✅ Report "${assignment.code}" has been confirmed`
                : `❌ Report "${assignment.code}" was rejected`;
            const body = isVerified
                ? `Tour report ${assignment.tourName ?? ''} has been confirmed.`
                : `Tour report ${assignment.tourName ?? ''} was rejected. ${dto.verificationNotes ?? ''}`;
            const notif = await this.notificationService.create(assignment.guideId, notifType, title, body, {
                assignmentId: id,
                reportStatus: dto.status,
            });
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
        return this.findOne(id);
    }
    async finalize(id, dto, actor) {
        const assignment = await this.findOne(id);
        if (assignment.status === client_1.AssignmentStatus.COMPLETED) {
            throw new common_1.BadRequestException('Tour already completed');
        }
        if (assignment.status === client_1.AssignmentStatus.CANCELED) {
            throw new common_1.BadRequestException('Canceled assignment cannot be closed');
        }
        const report = await this.prisma.tourReport.findUnique({
            where: { assignmentId: id },
        });
        if (!report) {
            throw new common_1.BadRequestException('No tour report submitted for this assignment');
        }
        if (report.status !== 'VERIFIED') {
            throw new common_1.BadRequestException('Tour report must be verified by accounting before completing');
        }
        if (!report.moneyVerifiedAt) {
            throw new common_1.BadRequestException('Tour money must be verified and locked by accounting before completing');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.assignment.update({
                where: { id },
                data: { status: client_1.AssignmentStatus.COMPLETED },
            });
            const existingReport = await tx.tourReport.findUnique({
                where: { assignmentId: id },
                select: { evidenceImages: true },
            });
            const prevEvidence = Array.isArray(existingReport?.evidenceImages)
                ? existingReport.evidenceImages
                : [];
            const mergedEvidence = [...prevEvidence, ...(dto.evidenceImages ?? [])];
            const data = {
                evidenceImages: mergedEvidence,
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
            const notif = await this.notificationService.create(assignment.guideId, client_1.NotificationType.REPORT_VERIFIED, `✅ Trip "${assignment.code ?? 'Bus'}" is completed`, `${assignment.tourName ?? 'Tour'} — closed by: ${actor.name ?? '—'}`, { assignmentId: id });
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
    async findMyAssignments(actor) {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 3);
        cutoff.setHours(0, 0, 0, 0);
        const where = {
            status: { not: client_1.AssignmentStatus.CANCELED },
            endDate: { gte: cutoff },
        };
        if (actor.role === client_1.RoleType.TRANSPORT_PROVIDER) {
            where.providerId = actor.providerId;
        }
        else {
            where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
        }
        const items = await this.prisma.assignment.findMany({
            where,
            include: {
                bookings: { orderBy: { paxSequence: 'asc' } },
                vehicle: true,
                provider: true,
                driver: { select: { id: true, name: true, email: true } },
                guide: { select: { id: true, name: true, email: true } },
                tourReport: true,
            },
            orderBy: [{ startDate: 'asc' }],
            take: 100,
        });
        const tourIds = [
            ...new Set(items
                .map((a) => a.bookings?.[0]?.tourId)
                .filter((id) => !!id)),
        ];
        const tours = tourIds.length > 0
            ? await this.prisma.tour.findMany({
                where: { id: { in: tourIds } },
                select: {
                    id: true,
                    itineraries: {
                        orderBy: [
                            { dayNumber: 'asc' },
                            { orderIndex: 'asc' },
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
    async findMyCalendar(actor, year, month) {
        const now = new Date();
        const y = year ?? now.getFullYear();
        const m = month ?? now.getMonth() + 1;
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        const where = {
            status: { not: client_1.AssignmentStatus.CANCELED },
            startDate: { lte: end },
            endDate: { gte: start },
        };
        if (actor.role === client_1.RoleType.TRANSPORT_PROVIDER) {
            where.providerId = actor.providerId;
        }
        else {
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
                status: { in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.APPROVED] },
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
    async findMyFleet(actor, startDate, endDate) {
        if (!actor.providerId) {
            return { providerId: null, items: [] };
        }
        const where = {
            providerId: actor.providerId,
            status: { not: client_1.AssignmentStatus.CANCELED },
        };
        if (startDate)
            where.startDate = { gte: new Date(startDate) };
        if (endDate)
            where.endDate = { lte: new Date(endDate + 'T23:59:59.999') };
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
    async remove(id) {
        await this.findOne(id);
        await this.prisma.booking.updateMany({
            where: { assignmentId: id },
            data: {
                assignmentId: null,
                paxSequence: 0,
                status: client_1.BookingStatus.PENDING,
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
};
exports.AssignmentsService = AssignmentsService;
exports.AssignmentsService = AssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, common_1.Inject)(storage_1.STORAGE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        assignment_board_service_1.AssignmentBoardService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway,
        leaves_service_1.LeavesService, Object])
], AssignmentsService);
//# sourceMappingURL=assignments.service.js.map