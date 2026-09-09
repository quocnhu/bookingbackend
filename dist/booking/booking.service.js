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
var BookingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const booking_normalizer_service_1 = require("../parsing/booking-normalizer.service");
const assignment_board_service_1 = require("../queues/assignment-board.service");
const assignment_queue_1 = require("../queues/assignment.queue");
let BookingService = BookingService_1 = class BookingService {
    prisma;
    auditService;
    normalizer;
    board;
    assignmentQueue;
    logger = new common_1.Logger(BookingService_1.name);
    constructor(prisma, auditService, normalizer, board, assignmentQueue) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.normalizer = normalizer;
        this.board = board;
        this.assignmentQueue = assignmentQueue;
    }
    async upsert(data, rawDataId, actorId, createdWho) {
        const bookingRef = data.bookingRef;
        const existing = await this.findExisting(data.source, bookingRef);
        const bookingData = {
            bookingRef,
            confirmationCode: data.bookingRef,
            source: data.source,
            channel: this.normalizer.channelForSource(data.source) ??
                data.channel ??
                client_1.BookingProvider.WEBSITE,
            status: data.action === 'CANCEL'
                ? client_1.BookingStatus.CANCELED
                : (data.status ?? client_1.BookingStatus.PENDING),
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
    async postWrite(booking) {
        if (booking.status === client_1.BookingStatus.CANCELED) {
            await this.board.unassign(booking.id);
            return;
        }
        if (!booking.assignmentId && booking.startingDate) {
            await this.assignmentQueue.enqueue(booking.id);
        }
    }
    async createManual(data, actorId) {
        const bookingRef = data.bookingRef ||
            data.confirmationCode ||
            (await this.generateManualBookingRef(data.tourType));
        const existing = await this.prisma.booking.findUnique({
            where: { bookingRef },
        });
        if (existing)
            throw new common_1.ConflictException('Booking reference already exists');
        const clean = {
            action: 'CREATE',
            bookingRef,
            source: data.source ?? 'manual',
            channel: data.channel ?? client_1.BookingProvider.MANUAL,
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
    async findExisting(source, bookingRef) {
        if (source && bookingRef) {
            const byKey = await this.prisma.booking.findUnique({
                where: {
                    source_confirmationCode: { source, confirmationCode: bookingRef },
                },
            });
            if (byKey)
                return byKey;
        }
        return this.prisma.booking.findUnique({ where: { bookingRef } });
    }
    async generateManualBookingRef(tourType) {
        const prefixCode = tourType === client_1.TourType.PRIVATE_TOUR
            ? 'PRV'
            : tourType === client_1.TourType.GROUP_TOUR
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
    async findAll(query, actor) {
        const { page, limit, status, channel, payment, tourId, assignmentId } = query;
        const where = {};
        if (status)
            where.status = status;
        if (channel)
            where.channel = channel;
        if (payment)
            where.payment = payment;
        if (tourId)
            where.tourId = tourId;
        if (assignmentId)
            where.assignmentId = assignmentId;
        if (actor.role !== client_1.RoleType.ADMIN) {
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
    async findOne(id) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: { tour: true, rawData: { select: { payload: true } } },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        return booking;
    }
    async create(dto, actor) {
        const bookingRef = dto.bookingRef || (await this.generateManualBookingRef(dto.tourType));
        const existing = await this.prisma.booking.findUnique({
            where: { bookingRef },
        });
        if (existing)
            throw new common_1.ConflictException('Booking reference already exists');
        const data = { ...dto, bookingRef };
        if (dto.startingDate)
            data.startingDate = new Date(dto.startingDate);
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
    async update(id, dto) {
        const before = await this.findOne(id);
        const data = { ...dto };
        if (dto.startingDate)
            data.startingDate = new Date(dto.startingDate);
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
    async remove(id) {
        await this.findOne(id);
        await this.prisma.booking.delete({ where: { id } });
        await this.auditService.log({
            entityType: 'Booking',
            entityId: id,
            action: 'DELETE',
        });
        return { message: 'Booking deleted' };
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = BookingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        booking_normalizer_service_1.BookingNormalizerService,
        assignment_board_service_1.AssignmentBoardService,
        assignment_queue_1.AssignmentQueue])
], BookingService);
//# sourceMappingURL=booking.service.js.map