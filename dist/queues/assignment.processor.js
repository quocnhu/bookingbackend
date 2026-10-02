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
const auto_crew_service_1 = require("./auto-crew.service");
const queue_constants_1 = require("./queue.constants");
const BUS_MAX_PAX = 12;
function toDateKey(d) {
    return d.toISOString().split('T')[0];
}
let AssignmentProcessor = AssignmentProcessor_1 = class AssignmentProcessor extends bullmq_1.WorkerHost {
    prisma;
    board;
    auditService;
    autoCrew;
    logger = new common_1.Logger(AssignmentProcessor_1.name);
    constructor(prisma, board, auditService, autoCrew) {
        super();
        this.prisma = prisma;
        this.board = board;
        this.auditService = auditService;
        this.autoCrew = autoCrew;
    }
    async process(job) {
        const { bookingId } = job.data;
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { tour: true },
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
            const bus = await this.createBusForBooking(booking);
            this.logger.log(`No open bus for booking ${booking.bookingRef} — created bus ${bus.code}`);
            const result = await this.board.attach(bus.id, bookingId);
            if (!result.assigned) {
                return { skipped: true, reason: 'ASSIGN_FAILED' };
            }
            await this.auditService.log({
                entityType: 'Assignment',
                entityId: bus.id,
                action: 'AUTO_CREATE_BUS',
                afterData: {
                    bookingId,
                    bookingRef: booking.bookingRef,
                    assignmentId: bus.id,
                },
                changedBy: null,
            });
            await this.assignCrew(bus.id);
            return {
                status: 'CREATED_BUS',
                bookingId,
                bookingRef: booking.bookingRef,
                assignmentId: bus.id,
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
        await this.assignCrew(candidate.id);
        return {
            status: 'ASSIGNED',
            bookingId,
            bookingRef: booking.bookingRef,
            assignmentId: candidate.id,
        };
    }
    async assignCrew(assignmentId) {
        try {
            const { assigned } = await this.autoCrew.assignCrewForBus(assignmentId);
            if (assigned) {
                this.logger.log(`Auto-assigned crew for bus ${assignmentId}`);
            }
        }
        catch (error) {
            this.logger.warn(`Auto-crew skipped for bus ${assignmentId}: ${error.message}`);
        }
    }
    async createBusForBooking(booking) {
        const bookingDateKey = toDateKey(new Date(booking.startingDate));
        const startDate = new Date(bookingDateKey + 'T00:00:00.000Z');
        const durationDays = booking.tour?.durationDays ?? 1;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.max(1, durationDays - 1));
        const label = booking.tourType === client_1.TourType.PRIVATE_TOUR ? 'Priv' : 'Group';
        const existing = await this.prisma.assignment.findMany({
            where: { code: { startsWith: `${label} Bus -` } },
            select: { code: true },
        });
        const numbers = existing
            .map((a) => parseInt((a.code ?? '').split('-')[1]?.trim() ?? '0', 10))
            .filter((n) => !Number.isNaN(n));
        const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
        const companyVehicle = await this.findCompanyVehicle(booking, startDate, endDate);
        return this.prisma.assignment.create({
            data: {
                code: `${label} Bus - ${nextNumber}`,
                startDate,
                endDate,
                status: client_1.AssignmentStatus.PENDING,
                origin: client_1.AssignmentOrigin.AUTO_ASSIGN,
                tourType: booking.tourType ?? null,
                tourName: booking.tourName ?? booking.tour?.name ?? undefined,
                durationDays,
                totalPax: booking.totalPax ?? 0,
                createdWho: 'Auto-Assign System',
                vehicleId: companyVehicle?.id ?? null,
                providerId: companyVehicle?.providerId ?? null,
                priceOverride: companyVehicle?.provider?.isCompany ? 0 : undefined,
            },
        });
    }
    async findCompanyVehicle(booking, startDate, endDate) {
        const pax = booking.totalPax ?? 1;
        return this.prisma.vehicle.findFirst({
            where: {
                capacity: { gte: pax },
                provider: { isCompany: true },
                assignments: {
                    none: {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                        status: {
                            notIn: [client_1.AssignmentStatus.CANCELED, client_1.AssignmentStatus.COMPLETED],
                        },
                    },
                },
            },
            orderBy: [{ capacity: 'asc' }],
            select: { id: true, providerId: true, provider: { select: { isCompany: true } } },
        });
    }
    async findCandidate(booking) {
        const bookingTourName = booking.tour?.name ?? booking.tourName;
        const bookingTourType = booking.tour?.type ?? booking.tourType;
        const bookingDateKey = toDateKey(new Date(booking.startingDate));
        const candidates = await this.prisma.assignment.findMany({
            where: {
                status: {
                    in: [client_1.AssignmentStatus.DRAFT_ASSIGNED, client_1.AssignmentStatus.PENDING],
                },
                startDate: { lte: new Date(booking.startingDate) },
                endDate: { gte: new Date(booking.startingDate) },
            },
            include: {
                bookings: {
                    include: { tour: { select: { name: true, type: true } } }
                },
                vehicle: {
                    select: {
                        id: true,
                        capacity: true,
                        provider: { select: { isCompany: true } },
                    },
                },
            },
            orderBy: [{ startDate: 'asc' }],
        });
        const typeOk = (a) => {
            const aTourName = a.tourName ?? a.bookings[0]?.tour?.name;
            const aTourType = a.tourType ?? a.bookings[0]?.tour?.type;
            if (bookingTourType && aTourType && aTourType !== bookingTourType)
                return false;
            if (bookingTourName && aTourName && aTourName !== bookingTourName)
                return false;
            if (toDateKey(a.startDate) !== bookingDateKey)
                return false;
            return true;
        };
        const capOk = (a) => {
            const used = a.bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
            return (used + (booking.totalPax ?? 0) <=
                Math.min(a.vehicle?.capacity ?? BUS_MAX_PAX, BUS_MAX_PAX));
        };
        const matches = candidates.filter((a) => typeOk(a) && capOk(a));
        if (matches.length === 0)
            return null;
        matches.sort((a, b) => {
            const aTourName = a.tourName ?? a.bookings[0]?.tour?.name;
            const bTourName = b.tourName ?? b.bookings[0]?.tour?.name;
            const aExactName = aTourName === bookingTourName ? 0 : 1;
            const bExactName = bTourName === bookingTourName ? 0 : 1;
            if (aExactName !== bExactName)
                return aExactName - bExactName;
            const aCompany = a.vehicle?.provider?.isCompany ? 0 : 1;
            const bCompany = b.vehicle?.provider?.isCompany ? 0 : 1;
            if (aCompany !== bCompany)
                return aCompany - bCompany;
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
        audit_service_1.AuditService,
        auto_crew_service_1.AutoCrewService])
], AssignmentProcessor);
//# sourceMappingURL=assignment.processor.js.map