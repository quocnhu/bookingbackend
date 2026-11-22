import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AssignmentStatus,
  BookingStatus,
  NotificationType,
  RoleType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { DispatchPolicyService } from '@/dispatch-policy/dispatch-policy.service';

const HCM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * At 05:00 on the departure day, tell Admin/Office how many late bookings are
 * still waiting. The customer response (confirmation mail) is released only
 * after an operator places the booking on a real bus.
 */
@Injectable()
export class WaitingListCron {
  private readonly logger = new Logger(WaitingListCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
    private readonly dispatchPolicy: DispatchPolicyService,
  ) {}

  @Cron('0 5 * * *', { timeZone: HCM_TIMEZONE })
  async scheduled() {
    try {
      const today = this.dispatchPolicy.todayHcm();
      const waiting = await this.prisma.assignment.findMany({
        where: {
          status: AssignmentStatus.WAITING_LIST,
          startDate: { gte: today.start, lte: today.end },
        },
        select: {
          id: true,
          code: true,
          tourName: true,
          bookings: {
            where: { status: { not: BookingStatus.CANCELED } },
            select: { bookingRef: true, totalPax: true },
          },
        },
      });
      const pending = waiting.filter((row) => row.bookings.length > 0);
      if (pending.length === 0) return;

      const pax = pending.reduce(
        (sum, row) =>
          sum +
          row.bookings.reduce(
            (inner, booking) => inner + (booking.totalPax ?? 0),
            0,
          ),
        0,
      );
      const body = `${pending.length} waiting-list bus(es), ${pax} pax for today. Place them on open buses or contact the guests.`;
      const users = await this.prisma.user.findMany({
        where: {
          role: { in: [RoleType.ADMIN, RoleType.OFFICE] },
          isActive: true,
        },
        select: { id: true },
      });
      for (const user of users) {
        const notification = await this.notificationService.create(
          user.id,
          NotificationType.GENERAL,
          'Waiting list needs placement',
          body,
          {
            kind: 'WAITING_LIST_0500',
            url: '/bookings',
          },
        );
        this.gateway.notifyUser(user.id, 'notification', notification);
      }
      this.logger.log(
        `05:00 waiting list alert: buses=${pending.length}, pax=${pax}, admins=${users.length}`,
      );
    } catch (error) {
      this.logger.error(
        `05:00 waiting list alert failed: ${(error as Error).message}`,
      );
    }
  }
}
