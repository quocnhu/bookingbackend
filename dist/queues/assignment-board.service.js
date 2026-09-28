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
var AssignmentBoardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentBoardService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const distance_1 = require("../geo/distance");
const BUS_MAX_PAX = 12;
let AssignmentBoardService = AssignmentBoardService_1 = class AssignmentBoardService {
    prisma;
    auditService;
    logger = new common_1.Logger(AssignmentBoardService_1.name);
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async unassign(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking || !booking.assignmentId)
            return { skipped: true };
        const assignmentId = booking.assignmentId;
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { assignmentId: null, paxSequence: 0 },
        });
        await this.resequence(assignmentId);
        await this.refreshSummary(assignmentId);
        await this.geoSort(assignmentId);
        return { unassigned: true, assignmentId };
    }
    async reorder(assignmentId, bookingIds) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: { bookings: { select: { id: true } } },
        });
        if (!assignment)
            return { error: 'ASSIGNMENT_NOT_FOUND' };
        const owned = new Set(assignment.bookings.map((b) => b.id));
        if (bookingIds.some((id) => !owned.has(id))) {
            return { error: 'BOOKING_NOT_IN_ASSIGNMENT' };
        }
        await this.prisma.$transaction(bookingIds.map((id, i) => this.prisma.booking.update({
            where: { id },
            data: { paxSequence: i + 1 },
        })));
        await this.refreshSummary(assignmentId);
        await this.auditService.log({
            entityType: 'Assignment',
            entityId: assignmentId,
            action: 'REORDER_BOOKINGS',
            afterData: { bookingIds },
        });
        return { reordered: true };
    }
    async move(fromAssignmentId, bookingId, toAssignmentId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking || booking.assignmentId !== fromAssignmentId) {
            return { error: 'BOOKING_NOT_IN_SOURCE' };
        }
        const target = await this.prisma.assignment.findUnique({
            where: { id: toAssignmentId },
            include: { bookings: true, vehicle: true },
        });
        if (!target)
            return { error: 'TARGET_NOT_FOUND' };
        if (target.status !== client_1.AssignmentStatus.PENDING &&
            target.status !== client_1.AssignmentStatus.DISPATCHED) {
            return { error: 'TARGET_NOT_OPEN' };
        }
        if (target.tourType &&
            booking.tourType &&
            target.tourType !== booking.tourType) {
            return { error: 'TOUR_TYPE_MISMATCH' };
        }
        if (!this.canFit(target, booking.totalPax ?? 0)) {
            return { error: 'TARGET_FULL' };
        }
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { assignmentId: null, paxSequence: 0 },
        });
        await this.resequence(fromAssignmentId);
        await this.attachBooking(toAssignmentId, bookingId);
        await this.refreshSummary(fromAssignmentId);
        await this.refreshSummary(toAssignmentId);
        await this.geoSort(fromAssignmentId);
        await this.geoSort(toAssignmentId);
        await this.auditService.log({
            entityType: 'Assignment',
            entityId: toAssignmentId,
            action: 'MOVE_BOOKING',
            afterData: { bookingId, fromAssignmentId },
        });
        return { moved: true, toAssignmentId };
    }
    async attach(assignmentId, bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking || booking.assignmentId)
            return { assigned: false };
        await this.attachBooking(assignmentId, bookingId);
        await this.refreshSummary(assignmentId);
        await this.geoSort(assignmentId);
        return { assigned: true, assignmentId };
    }
    async attachBooking(assignmentId, bookingId) {
        const maxSeq = await this.prisma.booking.aggregate({
            where: { assignmentId },
            _max: { paxSequence: true },
        });
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                assignmentId,
                paxSequence: (maxSeq._max.paxSequence ?? 0) + 1,
                status: client_1.BookingStatus.ASSIGNED,
            },
        });
    }
    canFit(assignment, pax) {
        const used = assignment.bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);
        const cap = Math.min(assignment.vehicle?.capacity ?? BUS_MAX_PAX, BUS_MAX_PAX);
        return used + pax <= cap;
    }
    async refreshSummary(assignmentId) {
        const bookings = await this.prisma.booking.findMany({
            where: { assignmentId },
            include: { tour: { select: { durationDays: true, type: true, name: true } } },
            orderBy: { paxSequence: 'asc' },
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
        await this.prisma.assignment.update({
            where: { id: assignmentId },
            data: { tourName, tourType, durationDays, totalPax },
        });
    }
    async resequence(assignmentId) {
        const bookings = await this.prisma.booking.findMany({
            where: { assignmentId },
            orderBy: { paxSequence: 'asc' },
            select: { id: true },
        });
        await this.prisma.$transaction(bookings.map((b, i) => this.prisma.booking.update({
            where: { id: b.id },
            data: { paxSequence: i + 1 },
        })));
    }
    async geoSort(assignmentId) {
        const bookings = await this.prisma.booking.findMany({
            where: { assignmentId },
            select: { id: true, latitude: true, longitude: true },
        });
        if (bookings.length <= 1)
            return;
        const profile = await this.prisma.companyProfile.findFirst();
        const root = (0, distance_1.rootFromProfile)(profile);
        const ordered = (0, distance_1.sortByRootDistance)(bookings, root);
        await this.prisma.$transaction(ordered.map((b, i) => this.prisma.booking.update({
            where: { id: b.id },
            data: { paxSequence: i + 1 },
        })));
    }
};
exports.AssignmentBoardService = AssignmentBoardService;
exports.AssignmentBoardService = AssignmentBoardService = AssignmentBoardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AssignmentBoardService);
//# sourceMappingURL=assignment-board.service.js.map