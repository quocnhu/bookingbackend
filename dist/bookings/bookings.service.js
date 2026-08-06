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
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
let BookingsService = class BookingsService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async findAll(query, actor) {
        const { page, limit, q, status, channel, payment, tourId, assignmentId } = query;
        const where = {};
        if (q) {
            where.OR = [
                { bookingRef: { contains: q, mode: 'insensitive' } },
                { customerName: { contains: q, mode: 'insensitive' } },
                { mail: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { tourName: { contains: q, mode: 'insensitive' } },
            ];
        }
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
            where.assignment = { OR: [{ driverId: actor.id }, { guideId: actor.id }] };
        }
        const [items, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                include: { tour: { select: { id: true, name: true } } },
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
    async create(dto) {
        const existing = await this.prisma.booking.findUnique({ where: { bookingRef: dto.bookingRef } });
        if (existing)
            throw new common_1.ConflictException('Booking reference already exists');
        const data = { ...dto };
        if (dto.startingDate)
            data.startingDate = new Date(dto.startingDate);
        const booking = await this.prisma.booking.create({ data });
        await this.auditService.log({
            entityType: 'Booking',
            entityId: booking.id,
            action: 'CREATE',
            afterData: booking,
        });
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
        return booking;
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.booking.delete({ where: { id } });
        await this.auditService.log({ entityType: 'Booking', entityId: id, action: 'DELETE' });
        return { message: 'Booking deleted' };
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map