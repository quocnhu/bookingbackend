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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const assignment_board_service_1 = require("../queues/assignment-board.service");
const notification_service_1 = require("../notifications/notification.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
let AssignmentsService = class AssignmentsService {
    prisma;
    auditService;
    board;
    notificationService;
    gateway;
    constructor(prisma, auditService, board, notificationService, gateway) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.board = board;
        this.notificationService = notificationService;
        this.gateway = gateway;
    }
    include = {
        bookings: {
            orderBy: { paxSequence: 'asc' },
            include: {
                settlements: true,
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
        settlements: true,
        tourReport: true,
    };
    async findBoard(actor) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const where = {
            status: { notIn: [client_1.AssignmentStatus.CANCELED, client_1.AssignmentStatus.COMPLETED] },
            endDate: { gte: startOfToday },
        };
        if (actor.role !== client_1.RoleType.ADMIN && actor.role !== client_1.RoleType.OFFICE) {
            where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
        }
        const items = await this.prisma.assignment.findMany({
            where,
            include: this.include,
            orderBy: [{ startDate: 'asc' }],
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
    async dispatchAllBoard() {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const items = await this.prisma.assignment.findMany({
            where: {
                status: client_1.AssignmentStatus.PENDING,
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
                endDate: { gte: startOfToday },
            },
            data: { origin },
        });
        return { updated: result.count };
    }
    decorateBoardCard(a) {
        const totalPax = a.totalPax ??
            a.bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
        const type = a.tourType ?? a.bookings.find((b) => b.tourType)?.tourType ?? null;
        const tourName = a.tourName ?? a.bookings.find((b) => b.tourName)?.tourName ?? a.code ?? 'Tour';
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
        return { ...a, totalPax, tourType: type, tourName, durationDays, pickups };
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
            where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
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
        const assignment = await this.prisma.assignment.create({
            data: {
                code: dto.code,
                tourName: dto.tourName,
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
        const assignment = await this.prisma.assignment.update({
            where: { id },
            data: {
                code: dto.code,
                tourName: dto.tourName,
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
    async updateStatus(id, dto) {
        const before = await this.findOne(id);
        if (dto.status === before.status)
            return before;
        if (dto.status === client_1.AssignmentStatus.COMPLETED) {
            const report = await this.prisma.tourReport.findUnique({ where: { assignmentId: id } });
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
    async ensureSettlement(assignment) {
        const collectCategory = await this.prisma.settlementCategory.findUnique({
            where: { code: 'COLLECT_ON_BEHALF' },
        });
        const vehicleCategory = await this.prisma.settlementCategory.findUnique({
            where: { code: 'VEHICLE_FEE' },
        });
        const createdById = assignment.guideId ?? assignment.driverId ?? null;
        if (!createdById)
            return;
        const bookings = assignment.bookings ?? [];
        for (const b of bookings) {
            const hasSettlement = await this.prisma.settlement.findFirst({
                where: { bookingId: b.id },
            });
            if (hasSettlement)
                continue;
            const amount = Number(b.tour?.adultPrice ?? 0) > 0 ? Number(b.tour.adultPrice) : 0;
            await this.prisma.settlement.create({
                data: {
                    amount,
                    note: `Thu hộ COD — ${b.customerName ?? b.bookingRef ?? 'khách'}`,
                    bookingId: b.id,
                    assignmentId: assignment.id,
                    categoryId: collectCategory?.id,
                    createdById,
                },
            });
        }
        if (assignment.providerId) {
            const hasVehicleSettlement = await this.prisma.settlement.findFirst({
                where: { assignmentId: assignment.id, categoryId: vehicleCategory?.id },
            });
            if (!hasVehicleSettlement) {
                await this.prisma.settlement.create({
                    data: {
                        amount: Number(assignment.priceOverride ?? 0),
                        note: `Phí xe — ${assignment.code ?? 'Bus'}`,
                        assignmentId: assignment.id,
                        categoryId: vehicleCategory?.id,
                        createdById,
                    },
                });
            }
        }
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
                    title = `🚌 ${code} xuất bến`;
                    body = `Chuyến ${tour} đã bắt đầu. Vui lòng lên xe.`;
                    break;
                case client_1.AssignmentStatus.TRANSFERRED:
                    type = client_1.NotificationType.TRANSFERRED;
                    title = `🔄 ${code} — Đã thay đổi`;
                    body = `Chuyến ${tour} đã được đổi xe/vị trí. Kiểm tra lịch đón mới.`;
                    break;
                case client_1.AssignmentStatus.VERIFYING:
                    type = client_1.NotificationType.GENERAL;
                    title = `⏳ ${code} — Đang chờ xác minh`;
                    body = `Báo cáo chuyến ${tour} đã nộp. Chờ Admin/Kế toán xác minh.`;
                    break;
                case client_1.AssignmentStatus.CANCELED:
                    type = client_1.NotificationType.CANCELED;
                    title = `❌ ${code} — Đã hủy`;
                    body = `Chuyến ${tour} đã bị hủy. Khách đã được gỡ khỏi lịch.`;
                    break;
                case client_1.AssignmentStatus.COMPLETED:
                    type = client_1.NotificationType.GENERAL;
                    title = `✅ ${code} — Hoàn thành`;
                    body = `Chuyến ${tour} đã kết thúc.`;
                    break;
                case client_1.AssignmentStatus.DRAFT_ASSIGNED:
                    type = client_1.NotificationType.ASSIGNED;
                    title = `📋 ${code} — Đã gán draft`;
                    body = `Chuyến ${tour} đã được xếp xe. Đang chờ xác nhận.`;
                    break;
                default:
                    type = client_1.NotificationType.GENERAL;
                    title = `${code} — Cập nhật trạng thái`;
                    body = `Trạng thái chuyển: ${fromStatus} → ${toStatus}`;
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
        const existing = await this.prisma.booking.findMany({
            where: { id: { in: dto.bookingIds } },
            select: { id: true, assignmentId: true },
        });
        const busy = existing.find((b) => b.assignmentId && b.assignmentId !== id);
        if (busy) {
            throw new common_1.BadRequestException(`Booking ${busy.id} is already assigned to another assignment`);
        }
        const maxSeq = await this.prisma.booking.aggregate({
            where: { assignmentId: id },
            _max: { paxSequence: true },
        });
        await this.prisma.$transaction(dto.bookingIds.map((bookingId, i) => this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                assignmentId: id,
                paxSequence: (maxSeq._max.paxSequence ?? 0) + i + 1,
                status: client_1.BookingStatus.ASSIGNED,
            },
        })));
        await this.refreshSummary(id);
        await this.auditService.log({
            entityType: 'Assignment',
            entityId: id,
            action: 'ASSIGN_BOOKINGS',
            afterData: { bookingIds: dto.bookingIds },
        });
        return this.findOne(id);
    }
    async removeBooking(id, bookingId) {
        await this.findOne(id);
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.assignmentId !== id) {
            throw new common_1.NotFoundException('Booking not in this assignment');
        }
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { assignmentId: null, paxSequence: 0, status: client_1.BookingStatus.PENDING },
        });
        await this.refreshSummary(id);
        return this.findOne(id);
    }
    async reorderBookings(id, bookingIds) {
        const result = await this.board.reorder(id, bookingIds);
        if (result.error)
            throw new common_1.BadRequestException(result.error);
        return this.findOne(id);
    }
    async moveBooking(fromAssignmentId, bookingId, toAssignmentId) {
        const result = await this.board.move(fromAssignmentId, bookingId, toAssignmentId);
        if (result.error)
            throw new common_1.BadRequestException(result.error);
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { movedFromBusId: fromAssignmentId },
        });
        await this.notifyMoveBooking(fromAssignmentId, toAssignmentId, bookingId);
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
        const guest = `${booking?.customerName ?? 'Khách'}${booking?.bookingRef ? ` (${booking.bookingRef})` : ''}`;
        const recipients = [
            {
                id: from?.guideId,
                body: `Booking ${guest} đã được chuyển khỏi xe ${from?.code ?? ''} của bạn.`,
            },
            {
                id: to?.guideId,
                body: `Booking ${guest} mới được chuyển vào xe ${to?.code ?? ''} của bạn. Kiểm tra danh sách khách trước khi xuất bến.`,
            },
        ];
        for (const r of recipients) {
            if (!r.id)
                continue;
            const notif = await this.notificationService.create(r.id, client_1.NotificationType.TRANSFERRED, `🔄 ${to?.code ?? 'Xe'} — Khách thay đổi`, r.body, { bookingId, fromAssignmentId, toAssignmentId });
            this.gateway.notifyUser(r.id, 'notification', notif);
        }
    }
    async refreshSummary(assignmentId) {
        const bookings = await this.prisma.booking.findMany({
            where: { assignmentId },
            include: { tour: { select: { durationDays: true, type: true, name: true } } },
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
                verifiedById: null,
                verifiedByName: null,
                verifiedAt: null,
                verificationNotes: null,
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
    async verifyTourReport(id, dto, actor) {
        if (actor.role !== client_1.RoleType.ADMIN && actor.role !== client_1.RoleType.OFFICE) {
            throw new common_1.BadRequestException('Only accounting/management (ADMIN/OFFICE) can verify tour reports');
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
        if (dto.status === 'VERIFIED' && assignment.status !== client_1.AssignmentStatus.COMPLETED) {
            const completed = await this.prisma.assignment.update({
                where: { id },
                data: { status: client_1.AssignmentStatus.COMPLETED },
                include: this.include,
            });
            await this.ensureSettlement(completed);
        }
        if (assignment.guideId) {
            const isVerified = dto.status === 'VERIFIED';
            const notifType = isVerified ? client_1.NotificationType.REPORT_VERIFIED : client_1.NotificationType.REPORT_REJECTED;
            const title = isVerified
                ? `✅ Báo cáo "${assignment.code}" đã được xác nhận`
                : `❌ Báo cáo "${assignment.code}" bị từ chối`;
            const body = isVerified
                ? `Báo cáo tour ${assignment.tourName ?? ''} đã được kế toán xác nhận.`
                : `Báo cáo tour ${assignment.tourName ?? ''} bị từ chối. ${dto.verificationNotes ?? ''}`;
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
            throw new common_1.BadRequestException('Canceled assignment cannot be settled');
        }
        const collectedAmount = Number(dto.collectedAmount ?? 0);
        const services = (dto.services ?? [])
            .filter((s) => Number(s.amount) > 0)
            .map((s) => ({
            categoryId: s.categoryId ?? null,
            name: s.name,
            amount: Number(s.amount),
        }));
        const servicesTotal = services.reduce((sum, s) => sum + s.amount, 0);
        const netAmount = collectedAmount - servicesTotal;
        const settlementFlow = netAmount >= 0 ? client_1.FeeFlowType.COLLECT_MONEY : client_1.FeeFlowType.PAY_MONEY;
        await this.prisma.$transaction(async (tx) => {
            await tx.assignment.update({
                where: { id },
                data: { status: client_1.AssignmentStatus.COMPLETED },
            });
            const data = {
                collectedAmount,
                services,
                servicesTotal,
                netAmount,
                settlementFlow,
                finalizedById: actor.id,
                finalizedByName: actor.name,
                finalizedAt: new Date(),
            };
            await tx.tourReport.upsert({
                where: { assignmentId: id },
                update: data,
                create: { assignmentId: id, ...data },
            });
        });
        const withBookings = await this.prisma.assignment.findUniqueOrThrow({
            where: { id },
            include: this.include,
        });
        await this.ensureSettlement(withBookings);
        if (withBookings.guideId) {
            const flowText = settlementFlow === client_1.FeeFlowType.COLLECT_MONEY
                ? `Nộp lại công ty $${netAmount.toLocaleString('en-US')}`
                : `Công ty hoàn trả $${Math.abs(netAmount).toLocaleString('en-US')}`;
            const notif = await this.notificationService.create(withBookings.guideId, client_1.NotificationType.REPORT_VERIFIED, `✅ Chuyến "${withBookings.code ?? 'Bus'}" đã được quyết toán`, `${withBookings.tourName ?? 'Tour'} — ${flowText}. Người thực hiện: ${actor.name ?? '—'}`, { assignmentId: id });
            this.gateway.notifyUser(withBookings.guideId, 'notification', notif);
        }
        await this.auditService.log({
            entityType: 'Assignment',
            entityId: id,
            action: 'FINALIZE',
            afterData: {
                collectedAmount,
                servicesTotal,
                netAmount,
                settlementFlow,
                finalizedByName: actor.name,
            },
            changedBy: actor.id,
        });
        return this.findOne(id);
    }
    async findMyAssignments(actor) {
        const now = new Date();
        const where = {
            status: { not: client_1.AssignmentStatus.CANCELED },
            OR: [{ driverId: actor.id }, { guideId: actor.id }],
        };
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
        });
        const enriched = await Promise.all(items.map(async (a) => {
            let itinerary = [];
            const firstBooking = a.bookings[0];
            if (firstBooking?.tourId) {
                const tour = await this.prisma.tour.findUnique({
                    where: { id: firstBooking.tourId },
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                        durationDays: true,
                        departureLocation: true,
                        transportation: true,
                        itineraries: {
                            orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }],
                        },
                    },
                });
                if (tour)
                    itinerary = tour.itineraries;
            }
            return this.decorateBoardCard({ ...a, itinerary });
        }));
        return enriched;
    }
    async findMyCalendar(actor, year, month) {
        const now = new Date();
        const y = year ?? now.getFullYear();
        const m = month ?? now.getMonth() + 1;
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        const items = await this.prisma.assignment.findMany({
            where: {
                status: { not: client_1.AssignmentStatus.CANCELED },
                OR: [{ driverId: actor.id }, { guideId: actor.id }],
                startDate: { lte: end },
                endDate: { gte: start },
            },
            include: {
                vehicle: { select: { plateNumber: true } },
                driver: { select: { id: true, name: true } },
                guide: { select: { id: true, name: true } },
            },
            orderBy: { startDate: 'asc' },
        });
        return items.map((a) => {
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
        });
    }
    async findMyPayments(actor, startDate, endDate) {
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate
            ? new Date(endDate + 'T23:59:59.999')
            : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
        const profile = await this.prisma.guideProfile.findUnique({
            where: { userId: actor.id },
        });
        const guideType = profile?.type ?? client_1.GuideType.FREELANCE;
        const assignments = await this.prisma.assignment.findMany({
            where: {
                guideId: actor.id,
                status: client_1.AssignmentStatus.COMPLETED,
                endDate: { gte: start, lte: end },
            },
            include: {
                settlements: {
                    include: { category: true },
                },
                vehicle: { select: { plateNumber: true } },
            },
            orderBy: { endDate: 'asc' },
        });
        const lines = assignments.map((a) => {
            const collected = a.settlements.reduce((sum, s) => sum + (s.category?.flowType === client_1.FeeFlowType.COLLECT_MONEY ? s.amount : 0), 0);
            const paid = a.settlements.reduce((sum, s) => sum + (s.category?.flowType === client_1.FeeFlowType.PAY_MONEY ? s.amount : 0), 0);
            const net = collected - paid;
            return {
                id: a.id,
                code: a.code,
                tourName: a.tourName,
                vehiclePlate: a.vehicle?.plateNumber ?? null,
                startDate: a.startDate,
                endDate: a.endDate,
                collected,
                paid,
                net,
                items: a.settlements.map((s) => ({
                    id: s.id,
                    category: s.category?.name ?? s.customCategoryName ?? 'Other',
                    flowType: s.category?.flowType ?? client_1.FeeFlowType.COLLECT_MONEY,
                    amount: s.amount,
                    note: s.note,
                })),
            };
        });
        const totalCollected = lines.reduce((s, l) => s + l.collected, 0);
        const totalPaid = lines.reduce((s, l) => s + l.paid, 0);
        const totalNet = totalCollected - totalPaid;
        return {
            guideType,
            startDate: start,
            endDate: end,
            summary: {
                tours: lines.length,
                totalCollected,
                totalPaid,
                totalNet,
            },
            lines,
        };
    }
    async settlementSummary(from, to, guideId, driverId) {
        const gte = new Date(from);
        const lte = new Date(to);
        if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime()) || gte > lte) {
            throw new common_1.BadRequestException('Invalid settlement date range');
        }
        const where = {
            tourReport: { is: { finalizedAt: { gte, lte } } },
        };
        if (guideId)
            where.guideId = guideId;
        if (driverId)
            where.driverId = driverId;
        const assignments = await this.prisma.assignment.findMany({
            where,
            include: {
                vehicle: { select: { plateNumber: true } },
                driver: { select: { id: true, name: true, email: true } },
                guide: { select: { id: true, name: true, email: true } },
                tourReport: true,
                bookings: {
                    select: {
                        tourName: true,
                        tour: {
                            select: {
                                name: true,
                                itineraries: {
                                    orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }],
                                    select: { dayNumber: true, title: true, location: true },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { startDate: 'asc' },
        });
        const toNumber = (v) => Number(v ?? 0);
        const netOf = (a) => toNumber(a.tourReport?.netAmount);
        const collect = assignments.filter((a) => a.tourReport?.settlementFlow === client_1.FeeFlowType.COLLECT_MONEY);
        const pay = assignments.filter((a) => a.tourReport?.settlementFlow === client_1.FeeFlowType.PAY_MONEY);
        const lines = assignments.map((a) => {
            const places = [];
            const seen = new Set();
            for (const b of a.bookings) {
                for (const it of b.tour?.itineraries ?? []) {
                    const label = it.location && it.location !== '' ? it.location : it.title;
                    if (label && !seen.has(`${label}#${it.dayNumber}`)) {
                        seen.add(`${label}#${it.dayNumber}`);
                        places.push(it.dayNumber > 1 ? `Day ${it.dayNumber}: ${label}` : label);
                    }
                }
            }
            return {
                id: a.id,
                code: a.code ?? '—',
                tourName: a.tourName ??
                    a.bookings.find((b) => b.tourName)?.tourName ??
                    (a.bookings.find((b) => b.tour)?.tour?.name ?? null),
                vehiclePlate: a.vehicle?.plateNumber ?? null,
                guide: a.guide?.name ?? null,
                driver: a.driver?.name ?? null,
                startDate: a.startDate,
                endDate: a.endDate,
                collectedAmount: toNumber(a.tourReport?.collectedAmount),
                servicesTotal: toNumber(a.tourReport?.servicesTotal),
                netAmount: netOf(a),
                settlementFlow: a.tourReport?.settlementFlow ?? null,
                places,
            };
        });
        return {
            from,
            to,
            guideId,
            driverId,
            guideName: guideId
                ? (assignments.map((a) => a.guide?.name).find(Boolean) ?? null)
                : null,
            driverName: driverId
                ? (assignments.map((a) => a.driver?.name).find(Boolean) ?? null)
                : null,
            summary: {
                guideReturnsToCompany: {
                    count: collect.length,
                    total: collect.reduce((sum, a) => sum + netOf(a), 0),
                },
                companyReturnsToGuide: {
                    count: pay.length,
                    total: pay.reduce((sum, a) => sum + netOf(a), 0),
                },
            },
            lines,
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
                vehicle: { select: { id: true, plateNumber: true, capacity: true, brand: true } },
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
            data: { assignmentId: null, paxSequence: 0, status: client_1.BookingStatus.PENDING },
        });
        await this.prisma.assignment.delete({ where: { id } });
        await this.auditService.log({ entityType: 'Assignment', entityId: id, action: 'DELETE' });
        return { message: 'Assignment deleted' };
    }
};
exports.AssignmentsService = AssignmentsService;
exports.AssignmentsService = AssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        assignment_board_service_1.AssignmentBoardService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway])
], AssignmentsService);
//# sourceMappingURL=assignments.service.js.map