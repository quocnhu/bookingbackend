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
const cancellation_1 = require("../common/constants/cancellation");
const email_merge_util_1 = require("./email-merge.util");
const raw_data_entity_1 = require("../raw-data/raw-data.entity");
const TOUR_MATCH_MIN_SCORE = 0.5;
function normalizeTourName(name) {
    return name
        .toLowerCase()
        .replace(/^\s*[a-z0-9]{4,}\s*[-–—:]\s*/i, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}
function tokenOverlap(a, b) {
    const A = new Set(a.split(' ').filter(Boolean));
    const B = new Set(b.split(' ').filter(Boolean));
    if (A.size === 0 || B.size === 0)
        return 0;
    let common = 0;
    for (const t of A)
        if (B.has(t))
            common += 1;
    return common / Math.min(A.size, B.size);
}
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
    async upsert(data, rawDataId, actorId, createdWho, emailDate) {
        const bookingRef = data.bookingRef;
        const existing = await this.findExisting(data.source, bookingRef);
        const isAmendment = data.action === 'MODIFY';
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
        if (!tourId && tourName) {
            const matched = await this.resolveTourByName(tourName, tourType);
            if (matched) {
                tourId = matched.id;
                tourType ??= matched.type;
                this.logger.log(`Linked booking ${bookingRef} to tour "${matched.name}" (name match)`);
            }
        }
        const parsed = {
            bookingRef,
            source: data.source,
            channel: data.channel ??
                this.normalizer.channelForSource(data.source) ??
                client_1.BookingProvider.WEBSITE,
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
            extra: data.extra,
            emailDate: emailDate ?? existing?.emailDate ?? undefined,
        };
        const _createdWho = createdWho ?? (actorId ? undefined : 'Pub-Sub System');
        if (existing) {
            if (emailDate &&
                existing.emailDate &&
                emailDate.getTime() < existing.emailDate.getTime()) {
                this.logger.log(`Skipped stale email for ${bookingRef}: email ${emailDate.toISOString()} older than applied ${existing.emailDate.toISOString()}`);
                return {
                    booking: existing,
                    created: false,
                    outcome: raw_data_entity_1.RAW_DATA_OUTCOME.SKIPPED,
                };
            }
            if (existing.status === client_1.BookingStatus.CANCELED &&
                data.action !== 'CANCEL' &&
                !(emailDate &&
                    existing.emailDate &&
                    emailDate.getTime() > existing.emailDate.getTime())) {
                this.logger.log(`Ignored reactivation of canceled booking ${bookingRef}: no newer email date to justify leaving terminal state`);
                return {
                    booking: existing,
                    created: false,
                    outcome: raw_data_entity_1.RAW_DATA_OUTCOME.SKIPPED,
                };
            }
            const updateData = this.buildEmailUpdateData(parsed, existing, data.action);
            const changed = (0, email_merge_util_1.hasBookingChanges)(updateData, existing);
            const booking = await this.prisma.booking.update({
                where: { id: existing.id },
                data: updateData,
            });
            await this.auditService.log({
                entityType: 'Booking',
                entityId: booking.id,
                action: isAmendment ? 'AMEND_EMAIL' : 'UPSERT_EMAIL',
                beforeData: existing,
                afterData: booking,
                changedBy: actorId ?? null,
            });
            if (isAmendment) {
                this.logger.log(`Applied amendment to booking ${bookingRef} (${data.source})`);
            }
            if (booking.assignmentId &&
                this.dateChanged(existing.startingDate, booking.startingDate)) {
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
            this.logger.warn(`Amendment email for unknown booking ${bookingRef} (${data.source}) — created from the amendment`);
        }
        const booking = await this.prisma.booking.create({
            data: {
                ...parsed,
                confirmationCode: data.bookingRef,
                status: data.action === 'CANCEL'
                    ? client_1.BookingStatus.CANCELED
                    : (data.status ?? client_1.BookingStatus.PENDING),
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
            outcome: raw_data_entity_1.RAW_DATA_OUTCOME.CREATED,
        };
    }
    outcomeFor(action, changed) {
        if (action === 'CANCEL')
            return raw_data_entity_1.RAW_DATA_OUTCOME.CANCELLED;
        return changed
            ? raw_data_entity_1.RAW_DATA_OUTCOME.UPDATED
            : raw_data_entity_1.RAW_DATA_OUTCOME.UNCHANGED;
    }
    buildEmailUpdateData(parsed, existing, action) {
        return (0, email_merge_util_1.buildEmailUpdateData)(parsed, existing, action);
    }
    dateChanged(a, b) {
        if (!a || !b)
            return false;
        return a.getTime() !== b.getTime();
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
            departureTime: data.departureTime,
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
        const { booking } = await this.upsert(clean, undefined, actorId, data.createdWho ?? 'Manual Entry');
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
    async resolveTourByName(rawName, tourType) {
        const target = normalizeTourName(rawName);
        if (!target)
            return null;
        const tours = await this.prisma.tour.findMany({
            select: { id: true, name: true, type: true },
        });
        let best = null;
        let bestScore = 0;
        for (const tour of tours) {
            const norm = normalizeTourName(tour.name);
            if (!norm)
                continue;
            let score = tokenOverlap(norm, target);
            if (norm === target)
                score = 1;
            else if (norm.includes(target) || target.includes(norm))
                score = Math.max(score, 0.85);
            if (tourType && tour.type === tourType)
                score += 0.05;
            if (score > bestScore) {
                bestScore = score;
                best = { id: tour.id, name: tour.name, type: tour.type };
            }
        }
        return bestScore >= TOUR_MATCH_MIN_SCORE ? best : null;
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
        this.assertBookingContactFields(dto);
        if (dto.status === client_1.BookingStatus.ASSIGNED) {
            dto = { ...dto, status: client_1.BookingStatus.PENDING };
        }
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
    assertBookingContactFields(dto) {
        if (!dto.mail?.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
        if (!dto.paxDetail?.trim()) {
            throw new common_1.BadRequestException('Pax detail is required');
        }
    }
    async update(id, dto, actor) {
        const before = await this.findOne(id);
        if (before.assignmentId) {
            const assignment = await this.prisma.assignment.findUnique({
                where: { id: before.assignmentId },
                include: { tourReport: true },
            });
            const locked = assignment?.tourReport?.status === 'SUBMITTED' ||
                assignment?.tourReport?.status === 'VERIFIED';
            if (locked && actor?.role !== client_1.RoleType.ADMIN) {
                throw new common_1.BadRequestException('This booking is locked because the tour report has been submitted for verification. Only an administrator can change it; accounting can unlock it by rejecting the report.');
            }
        }
        const { overrideCancelWindow, ...dtoFields } = dto;
        if (dto.status === client_1.BookingStatus.CANCELED &&
            before.status !== client_1.BookingStatus.CANCELED) {
            this.assertCancelAllowed(before, overrideCancelWindow, actor);
        }
        const data = { ...dtoFields };
        if (dto.startingDate)
            data.startingDate = new Date(dto.startingDate);
        if (data.status === client_1.BookingStatus.ASSIGNED && !before.assignmentId) {
            data.status = client_1.BookingStatus.PENDING;
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
    assertCancelAllowed(booking, override, actor) {
        const deadline = (0, cancellation_1.cancelDeadline)(booking.startingDate);
        if (!deadline)
            return;
        if (Date.now() <= deadline.getTime())
            return;
        if (!override) {
            throw new common_1.BadRequestException(`Cancellation window closed — ${booking.bookingRef} departs on ${booking.startingDate.toISOString()} and can only be cancelled more than ${cancellation_1.CANCEL_WINDOW_HOURS}h before departure (deadline ${deadline.toISOString()}).`);
        }
        if (actor?.role !== client_1.RoleType.ADMIN) {
            throw new common_1.ForbiddenException('Only an administrator can cancel a booking inside the cancellation window');
        }
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
            const locked = booking.assignment?.tourReport?.status === 'SUBMITTED' ||
                booking.assignment?.tourReport?.status === 'VERIFIED';
            if (locked && actor?.role !== client_1.RoleType.ADMIN) {
                throw new common_1.BadRequestException(`Booking ${booking.bookingRef} is locked because the tour report has been submitted for verification. Only an administrator can change it; accounting can unlock it by rejecting the report.`);
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
    async remove(id, actor) {
        const booking = await this.findOne(id);
        if (booking.assignmentId) {
            const assignment = await this.prisma.assignment.findUnique({
                where: { id: booking.assignmentId },
                select: { tourReport: { select: { status: true } } },
            });
            const locked = assignment?.tourReport?.status === 'SUBMITTED' ||
                assignment?.tourReport?.status === 'VERIFIED';
            if (locked && actor?.role !== client_1.RoleType.ADMIN) {
                throw new common_1.BadRequestException('This booking is locked because the tour report has been submitted for verification. Only an administrator can delete it; accounting can unlock it by rejecting the report.');
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