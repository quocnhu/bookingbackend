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
var UnpaidBookingCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnpaidBookingCleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const assignment_board_service_1 = require("../queues/assignment-board.service");
const dispatch_policy_service_1 = require("../dispatch-policy/dispatch-policy.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const payment_service_1 = require("./payment.service");
const unpaid_booking_util_1 = require("../common/utils/unpaid-booking.util");
const BLOCKED_ASSIGNMENT_STATUSES = [
    client_1.AssignmentStatus.DISPATCHED,
    client_1.AssignmentStatus.VERIFYING,
    client_1.AssignmentStatus.COMPLETED,
];
let UnpaidBookingCleanupService = UnpaidBookingCleanupService_1 = class UnpaidBookingCleanupService {
    prisma;
    payments;
    audit;
    board;
    dispatchPolicy;
    gateway;
    logger = new common_1.Logger(UnpaidBookingCleanupService_1.name);
    running = false;
    constructor(prisma, payments, audit, board, dispatchPolicy, gateway) {
        this.prisma = prisma;
        this.payments = payments;
        this.audit = audit;
        this.board = board;
        this.dispatchPolicy = dispatchPolicy;
        this.gateway = gateway;
    }
    async scheduledTick() {
        if (this.running)
            return;
        this.running = true;
        try {
            const result = await this.runCleanup();
            if (result.cancelled > 0) {
                this.logger.log(`Unpaid booking cleanup: cancelled=${result.cancelled}, paid=${result.paid}, skipped=${result.skipped}`);
            }
        }
        catch (error) {
            this.logger.error(`Unpaid booking cleanup failed: ${error.message}`);
        }
        finally {
            this.running = false;
        }
    }
    async runCleanup(now = new Date()) {
        const result = {
            scanned: 0,
            cancelled: 0,
            paid: 0,
            skipped: 0,
        };
        const candidates = await this.prisma.booking.findMany({
            where: {
                channel: client_1.BookingProvider.WEBSITE,
                payment: client_1.PaymentStatus.PENDING,
                paymentMethod: client_1.PaymentMethod.PAYPAL,
                payLater: false,
                status: { not: client_1.BookingStatus.CANCELED },
                parentBookingId: null,
            },
            include: {
                assignment: { select: { id: true, status: true } },
                payments: {
                    where: { provider: 'PAYPAL' },
                    select: { id: true, status: true, providerOrderId: true },
                },
            },
            orderBy: { createdAt: 'asc' },
            take: 200,
        });
        if (candidates.length === 0)
            return result;
        result.scanned = candidates.length;
        if (!this.payments.isConfigured()) {
            this.logger.warn('Unpaid booking cleanup skipped: PayPal is not configured, so captures cannot be verified.');
            result.skipped = candidates.length;
            return result;
        }
        const mode = await this.dispatchPolicy.getMode();
        for (const booking of candidates) {
            if (booking.assignment &&
                BLOCKED_ASSIGNMENT_STATUSES.includes(booking.assignment.status)) {
                result.skipped += 1;
                continue;
            }
            const cutoffAt = booking.startingDate
                ? this.dispatchPolicy.cutoffFor(booking.startingDate, mode.cutoffTime)
                : null;
            const dueAt = (0, unpaid_booking_util_1.unpaidCancelAt)(booking.createdAt, cutoffAt);
            if (now.getTime() < dueAt.getTime())
                continue;
            let reconciled;
            try {
                reconciled = await this.payments.reconcileUnpaidBooking(booking.id);
            }
            catch (error) {
                this.logger.warn(`Unpaid booking ${booking.bookingRef}: PayPal reconcile failed (${error.message}); not cancelling.`);
                result.skipped += 1;
                continue;
            }
            if (reconciled.paid) {
                result.paid += 1;
                continue;
            }
            if (!reconciled.safeToCancel) {
                result.skipped += 1;
                continue;
            }
            await this.cancelUnpaidBooking(booking.id, booking.bookingRef, booking.assignmentId, booking.paymentNote, dueAt);
            result.cancelled += 1;
        }
        return result;
    }
    async cancelUnpaidBooking(bookingId, bookingRef, assignmentId, paymentNote, dueAt) {
        const reason = unpaid_booking_util_1.UNPAID_CANCELLATION_REASON;
        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: client_1.BookingStatus.CANCELED,
                paymentNote: paymentNote ? `${paymentNote}\n${reason}` : reason,
            },
        });
        await this.prisma.bookingPayment.updateMany({
            where: {
                bookingId,
                provider: 'PAYPAL',
                status: {
                    in: [client_1.PaymentRecordStatus.PENDING, client_1.PaymentRecordStatus.FAILED],
                },
            },
            data: {
                status: client_1.PaymentRecordStatus.FAILED,
                note: `Booking auto-cancelled: ${reason}`,
            },
        });
        let boardError = null;
        try {
            await this.board.unassign(bookingId);
            if (assignmentId)
                await this.board.cleanupAssignmentIfEmpty(assignmentId);
        }
        catch (error) {
            boardError = error.message;
            this.logger.warn(`Unpaid booking ${bookingRef} cancelled but bus cleanup failed: ${boardError}`);
        }
        await this.audit.log({
            entityType: 'Booking',
            entityId: bookingId,
            action: 'AUTO_CANCEL_UNPAID',
            beforeData: {
                bookingRef,
                status: client_1.BookingStatus.PENDING,
                payment: client_1.PaymentStatus.PENDING,
                assignmentId,
            },
            afterData: {
                bookingRef,
                status: updated.status,
                reason,
                dueAt: dueAt.toISOString(),
                ...(boardError ? { boardError } : {}),
            },
            changedBy: null,
        });
        this.gateway.notifyAll('board:refresh', {
            bookingId,
            action: 'unpaid_canceled',
        });
    }
};
exports.UnpaidBookingCleanupService = UnpaidBookingCleanupService;
__decorate([
    (0, schedule_1.Cron)('*/10 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UnpaidBookingCleanupService.prototype, "scheduledTick", null);
exports.UnpaidBookingCleanupService = UnpaidBookingCleanupService = UnpaidBookingCleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payment_service_1.PaymentService,
        audit_service_1.AuditService,
        assignment_board_service_1.AssignmentBoardService,
        dispatch_policy_service_1.DispatchPolicyService,
        notifications_gateway_1.NotificationsGateway])
], UnpaidBookingCleanupService);
//# sourceMappingURL=unpaid-booking-cleanup.service.js.map