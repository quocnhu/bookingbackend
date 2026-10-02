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
const node_crypto_1 = require("node:crypto");
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
            this.randomBookingRef(data.tourType);
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
                ? new Date(data.startingDate + 'T00:00:00.000+07:00').toISOString()
                : undefined,
            customerName: data.customerName,
            hotelName: data.hotelName,
            phone: data.phone,
            mail: data.mail,
            totalPax: data.totalPax,
            paxDetail: data.paxDetail,
            payment: data.payment ?? client_1.PaymentStatus.PAID,
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
    async previewBookingRef(tourType) {
        return this.randomBookingRef(tourType);
    }
    randomBookingRef(tourType) {
        const prefixCode = tourType === client_1.TourType.PRIVATE_TOUR
            ? 'PRV'
            : tourType === client_1.TourType.GROUP_TOUR
                ? 'GR'
                : 'MB';
        return `${prefixCode}-${(0, node_crypto_1.randomUUID)()}`;
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
        this.assertEmailForChannel(dto);
        const submitted = dto.bookingRef?.trim();
        let bookingRef = submitted || this.randomBookingRef(dto.tourType);
        let booking = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const data = { ...dto, bookingRef };
                if (dto.startingDate)
                    data.startingDate = new Date(dto.startingDate);
                if (!data.payment)
                    data.payment = client_1.PaymentStatus.PAID;
                data.createdWho = actor?.name ?? actor?.email ?? 'System';
                booking = await this.prisma.booking.create({ data });
                break;
            }
            catch (e) {
                const isUniqueViolation = e?.code === 'P2002';
                if (!isUniqueViolation || !this.looksGenerated(bookingRef) || attempt === 2) {
                    throw e;
                }
                this.logger.warn(`Booking ref is duplicated, issuing a new ref (attempt ${attempt + 1})`);
                bookingRef = this.randomBookingRef(dto.tourType);
            }
        }
        if (!booking)
            throw new common_1.ConflictException('Booking reference already exists');
        await this.auditService.log({
            entityType: 'Booking',
            entityId: booking.id,
            action: 'CREATE',
            afterData: booking,
        });
        await this.postWrite(booking);
        return booking;
    }
    looksGenerated(bookingRef) {
        return /^(PRV|GR|MB)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingRef);
    }
    assertEmailForChannel(dto) {
        if (dto.channel === client_1.BookingProvider.WEBSITE)
            return;
        if (!dto.mail?.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
    }
    async update(id, dto) {
        const before = await this.findOne(id);
        if (before.assignmentId) {
            const assignment = await this.prisma.assignment.findUnique({
                where: { id: before.assignmentId },
                include: { tourReport: true },
            });
            const locked = assignment?.tourReport?.status === 'SUBMITTED' || assignment?.tourReport?.status === 'VERIFIED';
            if (locked) {
                throw new common_1.BadRequestException('This booking is locked because the tour report has been submitted for verification. Only accounting can unlock by rejecting the report.');
            }
        }
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
    async assertCanPatchBookings(bookingIds, actor) {
        if (actor.permissions?.includes('booking.update'))
            return;
        const bookings = await this.prisma.booking.findMany({
            where: { id: { in: bookingIds } },
            select: { id: true, assignmentId: true },
        });
        if (bookings.length !== bookingIds.length) {
            throw new common_1.NotFoundException('Booking not found');
        }
        const assignmentIds = [
            ...new Set(bookings.map((b) => b.assignmentId).filter((v) => !!v)),
        ];
        if (assignmentIds.length === 0) {
            throw new common_1.ForbiddenException('Booking is not assigned to a bus yet, so it cannot be edited');
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
            throw new common_1.ForbiddenException('You can only edit the notes of bookings on trips you are responsible for');
        }
    }
    async updateBatch(items, actor) {
        if (items.length === 0)
            return [];
        await this.assertCanPatchBookings(items.map((i) => i.id), actor);
        const bookings = await this.prisma.booking.findMany({
            where: { id: { in: items.map((i) => i.id) } },
            include: { assignment: { include: { tourReport: true } } },
        });
        for (const booking of bookings) {
            const locked = booking.assignment?.tourReport?.status === 'SUBMITTED' || booking.assignment?.tourReport?.status === 'VERIFIED';
            if (locked) {
                throw new common_1.BadRequestException(`Booking ${booking.bookingRef} is locked because the tour report has been submitted for verification. Only accounting can unlock by rejecting the report.`);
            }
        }
        const updated = await this.prisma.$transaction(items.map((item) => this.prisma.booking.update({
            where: { id: item.id },
            data: {
                ...(item.notes !== undefined ? { notes: item.notes } : {}),
            },
        })));
        await this.auditService.log({
            entityType: 'Booking',
            entityId: items.map((i) => i.id).join(','),
            action: 'UPDATE_BATCH',
            afterData: { count: items.length },
            changedBy: actor.id,
        });
        for (const b of updated)
            await this.postWrite(b);
        return updated;
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