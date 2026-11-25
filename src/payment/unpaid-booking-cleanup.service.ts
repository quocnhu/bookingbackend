import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AssignmentStatus,
  BookingProvider,
  BookingStatus,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { AssignmentBoardService } from '@/queues/assignment-board.service';
import { DispatchPolicyService } from '@/dispatch-policy/dispatch-policy.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { PaymentService } from './payment.service';
import {
  UNPAID_CANCELLATION_REASON,
  unpaidCancelAt,
} from '@/common/utils/unpaid-booking.util';

const BLOCKED_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  AssignmentStatus.DISPATCHED,
  AssignmentStatus.VERIFYING,
  AssignmentStatus.COMPLETED,
];

export interface UnpaidCleanupResult {
  scanned: number;
  cancelled: number;
  paid: number;
  skipped: number;
}

/**
 * Cancels abandoned website/PayPal bookings after the grace window (and no
 * later than the dispatch cutoff), but only after verifying with PayPal that
 * the customer was not charged. The booking is canceled (never deleted) and
 * its payment/audit trail is kept.
 */
@Injectable()
export class UnpaidBookingCleanupService {
  private readonly logger = new Logger(UnpaidBookingCleanupService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
    private readonly audit: AuditService,
    private readonly board: AssignmentBoardService,
    private readonly dispatchPolicy: DispatchPolicyService,
    private readonly gateway: NotificationsGateway,
  ) {}

  @Cron('*/10 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async scheduledTick() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.runCleanup();
      if (result.cancelled > 0) {
        this.logger.log(
          `Unpaid booking cleanup: cancelled=${result.cancelled}, paid=${result.paid}, skipped=${result.skipped}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Unpaid booking cleanup failed: ${(error as Error).message}`,
      );
    } finally {
      this.running = false;
    }
  }

  async runCleanup(now: Date = new Date()): Promise<UnpaidCleanupResult> {
    const result: UnpaidCleanupResult = {
      scanned: 0,
      cancelled: 0,
      paid: 0,
      skipped: 0,
    };
    const candidates = await this.prisma.booking.findMany({
      where: {
        channel: BookingProvider.WEBSITE,
        payment: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.PAYPAL,
        payLater: false,
        status: { not: BookingStatus.CANCELED },
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
    if (candidates.length === 0) return result;
    result.scanned = candidates.length;

    if (!this.payments.isConfigured()) {
      this.logger.warn(
        'Unpaid booking cleanup skipped: PayPal is not configured, so captures cannot be verified.',
      );
      result.skipped = candidates.length;
      return result;
    }

    const mode = await this.dispatchPolicy.getMode();
    for (const booking of candidates) {
      if (
        booking.assignment &&
        BLOCKED_ASSIGNMENT_STATUSES.includes(booking.assignment.status)
      ) {
        result.skipped += 1;
        continue;
      }
      const cutoffAt = booking.startingDate
        ? this.dispatchPolicy.cutoffFor(booking.startingDate, mode.cutoffTime)
        : null;
      const dueAt = unpaidCancelAt(booking.createdAt, cutoffAt);
      if (now.getTime() < dueAt.getTime()) continue;

      let reconciled;
      try {
        reconciled = await this.payments.reconcileUnpaidBooking(booking.id);
      } catch (error) {
        this.logger.warn(
          `Unpaid booking ${booking.bookingRef}: PayPal reconcile failed (${(error as Error).message}); not cancelling.`,
        );
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

      await this.cancelUnpaidBooking(
        booking.id,
        booking.bookingRef,
        booking.assignmentId,
        booking.paymentNote,
        dueAt,
      );
      result.cancelled += 1;
    }
    return result;
  }

  private async cancelUnpaidBooking(
    bookingId: string,
    bookingRef: string,
    assignmentId: string | null,
    paymentNote: string | null,
    dueAt: Date,
  ) {
    const reason = UNPAID_CANCELLATION_REASON;
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELED,
        paymentNote: paymentNote ? `${paymentNote}\n${reason}` : reason,
      },
    });
    await this.prisma.bookingPayment.updateMany({
      where: {
        bookingId,
        provider: 'PAYPAL',
        status: {
          in: [PaymentRecordStatus.PENDING, PaymentRecordStatus.FAILED],
        },
      },
      data: {
        status: PaymentRecordStatus.FAILED,
        note: `Booking auto-cancelled: ${reason}`,
      },
    });

    let boardError: string | null = null;
    try {
      await this.board.unassign(bookingId);
      if (assignmentId) await this.board.cleanupAssignmentIfEmpty(assignmentId);
    } catch (error) {
      boardError = (error as Error).message;
      this.logger.warn(
        `Unpaid booking ${bookingRef} cancelled but bus cleanup failed: ${boardError}`,
      );
    }

    await this.audit.log({
      entityType: 'Booking',
      entityId: bookingId,
      action: 'AUTO_CANCEL_UNPAID',
      beforeData: {
        bookingRef,
        status: BookingStatus.PENDING,
        payment: PaymentStatus.PENDING,
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
}
