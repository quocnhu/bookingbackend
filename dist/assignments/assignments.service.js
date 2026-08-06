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
let AssignmentsService = class AssignmentsService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    include = {
        bookings: { orderBy: { paxSequence: 'asc' } },
        vehicle: true,
        provider: true,
        driver: { select: { id: true, name: true, email: true } },
        guide: { select: { id: true, name: true, email: true } },
        settlement: true,
    };
    async findAll(query, actor) {
        const { page, limit, q, status, vehicleId, driverId, guideId } = query;
        const where = {};
        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' } },
                { vehicle: { is: { plateNumber: { contains: q, mode: 'insensitive' } } } },
                { driver: { is: { name: { contains: q, mode: 'insensitive' } } } },
                { guide: { is: { name: { contains: q, mode: 'insensitive' } } } },
                { provider: { is: { name: { contains: q, mode: 'insensitive' } } } },
            ];
        }
        if (status)
            where.status = status;
        if (vehicleId)
            where.vehicleId = vehicleId;
        if (driverId)
            where.driverId = driverId;
        if (guideId)
            where.guideId = guideId;
        if (actor.role !== client_1.RoleType.ADMIN) {
            where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
        }
        const [items, total] = await Promise.all([
            this.prisma.assignment.findMany({
                where,
                include: this.include,
                orderBy: [{ startDate: 'desc' }],
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
    async create(dto) {
        const assignment = await this.prisma.assignment.create({
            data: {
                code: dto.code,
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
        if (dto.status === client_1.AssignmentStatus.COMPLETED) {
            await this.ensureSettlement(assignment);
        }
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
        if (assignment.settlement)
            return;
        if (assignment.providerId) {
            await this.prisma.settlement.create({
                data: {
                    assignmentId: assignment.id,
                    payeeType: client_1.PayeeType.V_PROVIDER,
                    providerId: assignment.providerId,
                    baseAmount: assignment.priceOverride ?? 0,
                    finalAmount: assignment.priceOverride ?? 0,
                    status: client_1.SettlementStatus.PENDING,
                },
            });
        }
        if (assignment.guideId) {
            await this.prisma.settlement.create({
                data: {
                    assignmentId: assignment.id,
                    payeeType: client_1.PayeeType.FREELANCE_GUIDE,
                    userId: assignment.guideId,
                    baseAmount: 0,
                    finalAmount: 0,
                    status: client_1.SettlementStatus.PENDING,
                },
            });
        }
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
            data: { assignmentId: id, paxSequence: (maxSeq._max.paxSequence ?? 0) + i + 1 },
        })));
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
            data: { assignmentId: null, paxSequence: 0 },
        });
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.booking.updateMany({
            where: { assignmentId: id },
            data: { assignmentId: null, paxSequence: 0 },
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
        audit_service_1.AuditService])
], AssignmentsService);
//# sourceMappingURL=assignments.service.js.map