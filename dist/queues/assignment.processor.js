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
const assignment_board_service_1 = require("./assignment-board.service");
const queue_constants_1 = require("./queue.constants");
const BUS_MAX_PAX = 12;
let AssignmentProcessor = AssignmentProcessor_1 = class AssignmentProcessor extends bullmq_1.WorkerHost {
    prisma;
    board;
    auditService;
    logger = new common_1.Logger(AssignmentProcessor_1.name);
    constructor(prisma, board, auditService) {
        super();
        this.prisma = prisma;
        this.board = board;
        this.auditService = auditService;
    }
    async process(job) {
        const { bookingId } = job.data;
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking)
            return { skipped: true, reason: 'BOOKING_NOT_FOUND' };
        if (booking.status === client_1.BookingStatus.CANCELED)
            return { skipped: true, reason: 'CANCELED' };
        if (booking.assignmentId)
            return {
                skipped: true,
                reason: 'ALREADY_ASSIGNED',
                assignmentId: booking.assignmentId,
            };
        if (!booking.startingDate)
            return { skipped: true, reason: 'NO_START_DATE' };
        const candidate = await this.findCandidate(booking);
        if (!candidate) {
            this.logger.log(`No open bus for booking ${booking.bookingRef} — stays PENDING for manual assignment`);
            return {
                status: 'NO_BUS_FOUND',
                bookingId,
                bookingRef: booking.bookingRef,
            };
        }
        const result = await this.board.attach(candidate.id, bookingId);
        if (!result.assigned) {
            return { skipped: true, reason: 'ASSIGN_FAILED' };
        }
        await this.auditService.log({
            entityType: 'Assignment',
            entityId: candidate.id,
            action: 'AUTO_ASSIGN',
            afterData: { bookingId, bookingRef: booking.bookingRef },
            changedBy: null,
        });
        this.logger.log(`Auto-assigned booking ${booking.bookingRef} -> bus ${candidate.code ?? candidate.id}`);
        return {
            status: 'ASSIGNED',
            bookingId,
            bookingRef: booking.bookingRef,
            assignmentId: candidate.id,
        };
    }
    async findCandidate(booking) {
        const candidates = await this.prisma.assignment.findMany({
            where: {
                status: {
                    in: [client_1.AssignmentStatus.DRAFT_ASSIGNED, client_1.AssignmentStatus.PENDING],
                },
                startDate: { lte: booking.startingDate },
                endDate: { gte: booking.startingDate },
            },
            include: { bookings: true, vehicle: true },
            orderBy: [{ startDate: 'asc' }],
        });
        const typeOk = (a) => booking.tourType == null ||
            a.tourType == null ||
            a.tourType === booking.tourType;
        const capOk = (a) => {
            const used = a.bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
            return (used + (booking.totalPax ?? 0) <=
                Math.min(a.vehicle?.capacity ?? BUS_MAX_PAX, BUS_MAX_PAX));
        };
        const matches = candidates.filter((a) => typeOk(a) && capOk(a));
        if (matches.length === 0)
            return null;
        matches.sort((a, b) => {
            const aExact = a.tourType === booking.tourType ? 0 : 1;
            const bExact = b.tourType === booking.tourType ? 0 : 1;
            if (aExact !== bExact)
                return aExact - bExact;
            return this.freeSeats(a) - this.freeSeats(b);
        });
        return matches[0];
    }
    freeSeats(a) {
        const cap = Math.min(a.vehicle?.capacity ?? BUS_MAX_PAX, BUS_MAX_PAX);
        const used = a.bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
        return cap - used;
    }
};
exports.AssignmentProcessor = AssignmentProcessor;
exports.AssignmentProcessor = AssignmentProcessor = AssignmentProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(queue_constants_1.ASSIGN_QUEUE, { concurrency: 5 }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        assignment_board_service_1.AssignmentBoardService,
        audit_service_1.AuditService])
], AssignmentProcessor);
//# sourceMappingURL=assignment.processor.js.map