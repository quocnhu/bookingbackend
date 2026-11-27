import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AssignmentExecutionMode,
  AssignmentStatus,
  BookingStatus,
  GuideType,
  NotificationType,
  RoleType,
  TransportRequestStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/mail/mail.service';
import {
  DispatchReadinessRow,
  dispatchReadinessDeparture,
} from '@/mail/dispatch-readiness.template';
import { DispatchPolicyService } from '@/dispatch-policy/dispatch-policy.service';
import { formatMailDate } from '@/mail/mail-format.util';
import { isUnpaidPayPalBooking } from '@/common/utils/unpaid-booking.util';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { findCrewConflict } from '@/common/utils/crew-availability.util';

const HCM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * At 20:00 the day before departure, email Admin/Office one table of tomorrow's
 * buses and every empty slot left on them (unconfirmed freelance guides,
 * missing crew/vehicle, unresolved provider requests, unpaid bookings, waiting
 * list), and also send the same summary as an in-app notification. It is a
 * one-way warning: changes are made on the dispatch board. Runs in both Manual
 * and Auto mode.
 */
@Injectable()
export class DispatchReadinessCron {
  private readonly logger = new Logger(DispatchReadinessCron.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly dispatchPolicy: DispatchPolicyService,
    private readonly notifications: NotificationService,
    private readonly gateway: NotificationsGateway,
  ) {}

  @Cron('0 20 * * *', { timeZone: HCM_TIMEZONE })
  async scheduled() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.sendTomorrowReport();
      this.logger.log(
        `20:00 dispatch readiness check: buses=${result.buses}, issues=${result.issues}, mail=${result.sent}, in-app=${result.notified}${result.reason ? `, reason=${result.reason}` : ''}`,
      );
    } catch (error) {
      this.logger.error(
        `20:00 dispatch readiness check failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    } finally {
      this.running = false;
    }
  }

  async sendTomorrowReport(): Promise<{
    sent: number;
    notified: number;
    buses: number;
    issues: number;
    reason?: string;
  }> {
    const tomorrow = this.dispatchPolicy.addDays(
      this.dispatchPolicy.todayHcm().start,
      1,
    );
    const dateKey = this.dispatchPolicy.dayKey(tomorrow);
    const range = this.dispatchPolicy.dayRange(tomorrow);
    const assignments = await this.prisma.assignment.findMany({
      where: {
        startDate: { gte: range.start, lte: range.end },
        status: {
          in: [
            AssignmentStatus.WAITING_LIST,
            AssignmentStatus.DRAFT_ASSIGNED,
            AssignmentStatus.PENDING,
            AssignmentStatus.TRANSFERRED,
          ],
        },
        executionMode: { not: AssignmentExecutionMode.OUTSOURCED_PARTNER },
      },
      select: {
        id: true,
        code: true,
        tourName: true,
        startDate: true,
        endDate: true,
        totalPax: true,
        status: true,
        executionMode: true,
        guideId: true,
        driverId: true,
        guideConfirmedAt: true,
        guideDeclinedAt: true,
        providerRequestStatus: true,
        providerDeadline: true,
        guide: {
          select: {
            name: true,
            email: true,
            guideProfile: { select: { type: true } },
          },
        },
        driver: { select: { name: true, email: true } },
        vehicle: { select: { plateNumber: true } },
        provider: { select: { name: true, isCompany: true } },
        bookings: {
          where: { status: { not: BookingStatus.CANCELED } },
          select: {
            bookingRef: true,
            channel: true,
            status: true,
            payment: true,
            paymentMethod: true,
            payLater: true,
          },
        },
      },
      orderBy: [{ startDate: 'asc' }, { code: 'asc' }],
    });

    const crewIssues = new Map<string, string[]>();
    for (const assignment of assignments) {
      if (assignment.status === AssignmentStatus.WAITING_LIST) continue;
      const issues: string[] = [];
      for (const [kind, userId] of [
        ['guide', assignment.guideId],
        ['driver', assignment.driverId],
      ] as const) {
        if (!userId) continue;
        const conflict = await findCrewConflict(
          this.prisma,
          kind,
          userId,
          assignment.startDate,
          assignment.endDate,
          assignment.id,
        );
        if (!conflict) continue;
        if (conflict.type === 'ASSIGNMENT') {
          issues.push(
            `${kind} ${conflict.name} is already on ${conflict.assignment?.code ?? 'another trip'}`,
          );
        } else if (conflict.type === 'LEAVE') {
          issues.push(`${kind} ${conflict.name} is on leave`);
        } else {
          issues.push(`${kind} ${conflict.name} is on hold`);
        }
      }
      if (issues.length) crewIssues.set(assignment.id, issues);
    }

    const now = Date.now();
    const rows = assignments.map((assignment): DispatchReadinessRow => {
      const issues: string[] = [];
      const waiting = assignment.status === AssignmentStatus.WAITING_LIST;
      const driverOnly =
        assignment.executionMode ===
        AssignmentExecutionMode.COMPANY_DRIVER_ONLY;
      const externalProvider = assignment.provider?.isCompany === false;
      const freelance =
        !!assignment.guide &&
        (assignment.guide.guideProfile?.type ?? GuideType.FREELANCE) ===
          GuideType.FREELANCE;
      const unpaid = assignment.bookings.filter((booking) =>
        isUnpaidPayPalBooking(booking),
      );

      if (waiting) issues.push('Waiting list — place after 05:00');
      issues.push(...(crewIssues.get(assignment.id) ?? []));
      if (unpaid.length > 0) {
        const refs = unpaid
          .map((booking) => booking.bookingRef)
          .filter(Boolean)
          .join(', ');
        issues.push(
          `Unpaid PayPal booking${unpaid.length > 1 ? 's' : ''}${refs ? ` (${refs})` : ''} — cannot dispatch`,
        );
      }

      if (!waiting) {
        if (!driverOnly) {
          if (!assignment.guide) {
            issues.push('No guide assigned');
          } else if (assignment.guideDeclinedAt) {
            issues.push('Guide declined the assignment');
          } else if (freelance && !assignment.guideConfirmedAt) {
            issues.push('Freelance guide has not confirmed yet');
          }
        }

        if (externalProvider) {
          switch (assignment.providerRequestStatus) {
            case TransportRequestStatus.NOT_REQUIRED:
              issues.push('Provider request not sent');
              break;
            case TransportRequestStatus.DECLINED:
              issues.push('Provider declined the request');
              break;
            case TransportRequestStatus.EXPIRED:
              issues.push('Provider request expired');
              break;
            case TransportRequestStatus.CANCELLED:
              issues.push('Provider request cancelled');
              break;
            case TransportRequestStatus.ASSIGNED:
              if (!assignment.driver)
                issues.push('Provider assigned — no driver');
              else if (!assignment.vehicle)
                issues.push('Provider assigned — no vehicle');
              break;
            default:
              if (
                assignment.providerDeadline &&
                assignment.providerDeadline.getTime() < now
              ) {
                issues.push('Provider deadline passed');
              } else if (!assignment.driver) {
                issues.push('Driver pending from provider');
              }
              break;
          }
        } else if (!assignment.driver) {
          issues.push('No driver assigned');
        }
      }

      const guideLabel = !assignment.guide
        ? '-'
        : [
            assignment.guide.name || assignment.guide.email || 'Guide',
            freelance ? 'freelance' : 'company',
            assignment.guideDeclinedAt
              ? 'declined'
              : assignment.guideConfirmedAt
                ? 'confirmed'
                : freelance
                  ? 'awaiting confirmation'
                  : null,
          ]
            .filter(Boolean)
            .join(' · ');

      return {
        bus: assignment.code || assignment.id,
        tour: assignment.tourName || '-',
        departure: dispatchReadinessDeparture(assignment.startDate),
        pax: assignment.totalPax ?? 0,
        guide: guideLabel,
        driver: assignment.driver?.name || assignment.driver?.email || '-',
        vehicle: assignment.vehicle?.plateNumber || '-',
        provider: assignment.provider?.name || '-',
        issues,
      };
    });

    rows.sort((left, right) => {
      const leftNeeds = left.issues.length > 0 ? 0 : 1;
      const rightNeeds = right.issues.length > 0 ? 0 : 1;
      return leftNeeds - rightNeeds;
    });

    const issueCount = rows.filter((row) => row.issues.length > 0).length;
    if (issueCount === 0) {
      return {
        sent: 0,
        notified: 0,
        buses: rows.length,
        issues: 0,
        reason: 'NO_ISSUES',
      };
    }

    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: [RoleType.ADMIN, RoleType.OFFICE] },
        isActive: true,
      },
      select: { id: true, email: true },
    });
    const frontend = (
      process.env.FRONTEND_URL ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    const result = await this.mail.sendDispatchReadiness({
      to: admins.map((user) => user.email),
      dateKey,
      dateLabel: formatMailDate(tomorrow),
      rows,
      actionUrl: `${frontend}/bookings?tab=assignments`,
    });

    const summary = `${issueCount} of ${rows.length} bus(es) for ${formatMailDate(tomorrow)} still need attention before the dispatch cutoff.`;
    for (const admin of admins) {
      const notification = await this.notifications.create(
        admin.id,
        NotificationType.GENERAL,
        'Dispatch readiness — empty places remain',
        summary,
        {
          kind: 'DISPATCH_READINESS',
          date: dateKey,
          buses: rows.length,
          issues: issueCount,
          url: '/bookings?tab=assignments',
        },
      );
      this.gateway.notifyUser(admin.id, 'notification', notification);
    }

    return {
      sent: result.sent,
      notified: admins.length,
      buses: rows.length,
      issues: issueCount,
      reason: result.reason,
    };
  }
}
