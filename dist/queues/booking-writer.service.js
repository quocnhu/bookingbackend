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
var BookingWriterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingWriterService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const booking_normalizer_service_1 = require("./booking-normalizer.service");
const queue_constants_1 = require("./queue.constants");
let BookingWriterService = BookingWriterService_1 = class BookingWriterService {
    prisma;
    auditService;
    normalizer;
    assignmentQueue;
    logger = new common_1.Logger(BookingWriterService_1.name);
    constructor(prisma, auditService, normalizer, assignmentQueue) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.normalizer = normalizer;
        this.assignmentQueue = assignmentQueue;
    }
    async writeFromRawData(rawDataId) {
        const raw = await this.prisma.rawData.findUnique({ where: { id: rawDataId } });
        if (!raw) {
            return { status: 'SKIPPED', reason: 'RAW_DATA_NOT_FOUND' };
        }
        const payload = raw.payload;
        const result = this.normalizer.normalize(payload);
        if (!result.clean || !result.data || result.data.action === 'SKIP') {
            await this.prisma.rawData.update({
                where: { id: rawDataId },
                data: {
                    status: 'PROCESSED',
                    payload: { ...payload, clean: false, reason: result.reason ?? 'SKIPPED' },
                },
            });
            return { status: 'SKIPPED', reason: result.reason ?? 'SKIPPED' };
        }
        const booking = await this.upsertBooking(result.data, rawDataId);
        await this.prisma.rawData.update({
            where: { id: rawDataId },
            data: {
                status: 'PROCESSED',
                payload: {
                    ...payload,
                    clean: true,
                    booking: result.data,
                },
            },
        });
        if (booking && result.data.action !== 'CANCEL') {
            await this.enqueueAssignment(booking.id);
        }
        return { status: 'PROCESSED', booking };
    }
    async createManual(data, actorId) {
        const existing = await this.prisma.booking.findUnique({ where: { bookingRef: data.bookingRef } });
        if (existing)
            throw new common_1.ConflictException('Booking reference already exists');
        const clean = {
            action: 'CREATE',
            bookingRef: data.bookingRef,
            channel: data.channel ?? client_1.BookingProvider.MANUAL,
            ...data,
        };
        const booking = await this.upsertBooking(clean, undefined, actorId);
        await this.enqueueAssignment(booking.id);
        return booking;
    }
    async upsertBooking(data, rawDataId, actorId) {
        const bookingRef = data.bookingRef;
        const existing = await this.prisma.booking.findUnique({ where: { bookingRef } });
        const bookingData = {
            bookingRef,
            channel: data.channel ?? client_1.BookingProvider.WEBSITE,
            status: data.action === 'CANCEL' ? client_1.BookingStatus.CANCELED : client_1.BookingStatus.PENDING,
            tourId: data.tourId,
            tourName: data.tourName,
            tourType: data.tourType,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            startingDate: data.startingDate ? new Date(data.startingDate) : undefined,
            customerName: data.customerName,
            hotelName: data.hotelName,
            phone: data.phone,
            mail: data.mail,
            totalPax: data.totalPax ?? 0,
            paxDetail: data.paxDetail,
            payment: data.payment,
            isNoShow: data.isNoShow,
            noShowReason: data.noShowReason,
            rawDataId: existing?.rawDataId ?? rawDataId,
        };
        if (existing) {
            const booking = await this.prisma.booking.update({
                where: { bookingRef },
                data: { ...bookingData, rawDataId: existing.rawDataId ?? rawDataId },
            });
            await this.auditService.log({
                entityType: 'Booking',
                entityId: booking.id,
                action: 'UPSERT_EMAIL',
                beforeData: { bookingRef },
                afterData: booking,
                changedBy: actorId ?? null,
            });
            return booking;
        }
        const booking = await this.prisma.booking.create({ data: bookingData });
        await this.auditService.log({
            entityType: 'Booking',
            entityId: booking.id,
            action: 'CREATE_EMAIL',
            afterData: booking,
            changedBy: actorId ?? null,
        });
        return booking;
    }
    async enqueueAssignment(bookingId) {
        await this.assignmentQueue.add(queue_constants_1.ASSIGNMENT_JOB, { bookingId }, {
            jobId: `assign-${bookingId}`,
            removeOnComplete: 1000,
            removeOnFail: 5000,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
        });
    }
};
exports.BookingWriterService = BookingWriterService;
exports.BookingWriterService = BookingWriterService = BookingWriterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bullmq_1.InjectQueue)(queue_constants_1.ASSIGNMENT_QUEUE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        booking_normalizer_service_1.BookingNormalizerService,
        bullmq_2.Queue])
], BookingWriterService);
//# sourceMappingURL=booking-writer.service.js.map