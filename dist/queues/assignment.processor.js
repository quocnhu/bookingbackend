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
var AssignmentProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const queue_constants_1 = require("./queue.constants");
const DEFAULT_CAPACITY = 29;
let AssignmentProcessor = AssignmentProcessor_1 = class AssignmentProcessor extends bullmq_1.WorkerHost {
    prisma;
    auditService;
    logger = new common_1.Logger(AssignmentProcessor_1.name);
    constructor(prisma, auditService) {
        super();
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async process(job) {
        const { bookingId } = job.data;
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { tour: true },
        });
        if (!booking)
            return { skipped: true, reason: 'BOOKING_NOT_FOUND' };
        if (booking.assignmentId)
            return { skipped: true, reason: 'ALREADY_ASSIGNED' };
        if (booking.status === client_1.BookingStatus.CANCELED)
            return { skipped: true, reason: 'CANCELED' };
        if (!booking.startingDate)
            return { skipped: true, reason: 'NO_START_DATE' };
        const start = booking.startingDate;
        const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const candidates = await this.prisma.assignment.findMany({
            where: {
                status: { in: [client_1.AssignmentStatus.PENDING, client_1.AssignmentStatus.DISPATCHED] },
                startDate: { gte: dayStart, lt: dayEnd },
            },
            include: {
                bookings: { select: { totalPax: true } },
                vehicle: { select: { capacity: true } },
            },
            orderBy: [{ sequenceIndex: 'asc' }, { startDate: 'asc' }],
            take: 10,
        });
        let assignmentId = null;
        for (const candidate of candidates) {
            const used = candidate.bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
            const capacity = candidate.vehicle?.capacity ?? DEFAULT_CAPACITY;
            if ((booking.totalPax ?? 0) + used <= capacity) {
                assignmentId = candidate.id;
                break;
            }
        }
        if (!assignmentId) {
            const assignment = await this.prisma.assignment.create({
                data: {
                    code: `${booking.tourName ?? 'Tour'}`,
                    startDate: dayStart,
                    endDate: dayEnd,
                    status: client_1.AssignmentStatus.PENDING,
                },
            });
            assignmentId = assignment.id;
            await this.auditService.log({
                entityType: 'Assignment',
                entityId: assignment.id,
                action: 'AUTO_CREATE',
                afterData: { fromBookingId: booking.id },
            });
        }
        const maxSeq = await this.prisma.booking.aggregate({
            where: { assignmentId },
            _max: { paxSequence: true },
        });
        const updated = await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
                assignmentId,
                paxSequence: (maxSeq._max.paxSequence ?? 0) + 1,
                status: client_1.BookingStatus.ASSIGNED,
            },
        });
        await this.auditService.log({
            entityType: 'Booking',
            entityId: booking.id,
            action: 'AUTO_ASSIGN',
            afterData: { assignmentId, paxSequence: updated.paxSequence },
        });
        this.logger.log(`Assigned booking ${booking.bookingRef} -> assignment ${assignmentId}`);
        return { assigned: true, assignmentId, paxSequence: updated.paxSequence };
    }
};
exports.AssignmentProcessor = AssignmentProcessor;
exports.AssignmentProcessor = AssignmentProcessor = AssignmentProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(queue_constants_1.ASSIGNMENT_QUEUE, { concurrency: 50 }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AssignmentProcessor);
//# sourceMappingURL=assignment.processor.js.map