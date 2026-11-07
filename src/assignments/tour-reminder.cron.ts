import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AssignmentExecutionMode,
  AssignmentStatus,
  NotificationType,
  RoleType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AutoCrewService } from '@/queues/auto-crew.service';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';

const HCM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const REMINDER_LOOKBACK_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TourReminderCron {
  private readonly logger = new Logger(TourReminderCron.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly autoCrew: AutoCrewService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
  ) {}

  @Cron('0 23 * * *', { timeZone: HCM_TIMEZONE })
  async scheduled() {
    try {
      const result = await this.sendTomorrowReminders();
      this.logger.log(
        `23:00 tour reminders: scanned=${result.scanned}, notified=${result.notified}, missingCrew=${result.missingCrew}`,
      );
    } catch (error) {
      this.logger.error(
        '23:00 tour reminders failed',
        (error as Error).stack,
      );
    }
  }

  async sendTomorrowReminders(targetDate?: Date) {
    if (this.running) {
      return { scanned: 0, notified: 0, missingCrew: 0 };
    }
    this.running = true;
    try {
      await this.fillCrewIfAutomatic();
      return await this.sendRemindersForDate(
        targetDate ?? this.tomorrowStart(),
      );
    } finally {
      this.running = false;
    }
  }

  private async fillCrewIfAutomatic() {
    const [mode, enabled] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'assignMode' } }),
      this.prisma.systemSetting.findUnique({
        where: { key: 'autoDispatchEnabled' },
      }),
    ]);
    if (mode?.value === 'MANUAL') return;
    if ((enabled?.value ?? 'true').toLowerCase() === 'false') return;

    const result = await this.autoCrew.assignMissingCrew(1);
    this.logger.log(
      `23:00 crew fill: scanned=${result.scanned}, guide+${result.guideAssigned}, driver+${result.driverAssigned}`,
    );
  }

  private async sendRemindersForDate(targetDate: Date) {
    const start = this.startOfDay(targetDate);
    const end = this.endOfDay(targetDate);
    const assignments = await this.prisma.assignment.findMany({
      where: {
        startDate: { gte: start, lte: end },
        status: {
          in: [
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
        totalPax: true,
        guideId: true,
        driverId: true,
        pickupInfo: true,
        guide: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true, isCompany: true } },
        vehicle: { select: { plateNumber: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    let notified = 0;
    let missingCrew = 0;

    for (const assignment of assignments) {
      const missing: string[] = [];
      if (!assignment.guideId) missing.push('tour guide');
      if (!assignment.driverId) missing.push('driver');

      if (missing.length > 0) {
        missingCrew++;
        await this.notifyAdmins(
          'Crew missing for tomorrow',
          `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} is missing ${missing.join(' and ')}.`,
          'TOUR_REMINDER_MISSING_CREW',
          assignment.id,
        );
      }

      const recipients = [assignment.guideId, assignment.driverId].filter(
        (id): id is string => Boolean(id),
      );
      if (recipients.length === 0) continue;

      const title = `Tour tomorrow: ${assignment.tourName ?? assignment.code ?? 'Tour'}`;
      const body = this.buildReminderBody(assignment);

      for (const userId of recipients) {
        if (
          await this.alreadyNotified(userId, assignment.id, 'TOUR_REMINDER')
        ) {
          continue;
        }
        const notification = await this.notificationService.create(
          userId,
          NotificationType.GENERAL,
          title,
          body,
          {
            kind: 'TOUR_REMINDER',
            assignmentId: assignment.id,
            startDate: assignment.startDate.toISOString(),
            url:
              userId === assignment.guideId
                ? '/tour-guide/my-trips'
                : '/driver/my-trips',
          },
        );
        this.gateway.notifyUser(userId, 'notification', notification);
        notified++;
      }
    }

    return { scanned: assignments.length, notified, missingCrew };
  }

  private buildReminderBody(assignment: {
    startDate: Date;
    totalPax: number;
    pickupInfo: unknown;
    guide: { name: string | null } | null;
    driver: { name: string | null } | null;
    vehicle: { plateNumber: string | null } | null;
  }) {
    const crew = [
      assignment.guide?.name ? `Guide: ${assignment.guide.name}` : null,
      assignment.driver?.name ? `Driver: ${assignment.driver.name}` : null,
      assignment.vehicle?.plateNumber
        ? `Vehicle: ${assignment.vehicle.plateNumber}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const pickups = Array.isArray(assignment.pickupInfo)
      ? assignment.pickupInfo
          .map((item: any) => item?.pickup)
          .filter((value): value is string => Boolean(value))
          .slice(0, 3)
          .join('; ')
      : '';

    return [
      this.formatDateTime(assignment.startDate),
      `${assignment.totalPax} pax`,
      crew || null,
      pickups ? `Pickup: ${pickups}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  private async notifyAdmins(
    title: string,
    body: string,
    kind: string,
    assignmentId: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: [RoleType.ADMIN, RoleType.OFFICE] },
        isActive: true,
      },
      select: { id: true },
    });

    for (const user of users) {
      if (await this.alreadyNotified(user.id, assignmentId, kind)) continue;
      const notification = await this.notificationService.create(
        user.id,
        NotificationType.GENERAL,
        title,
        body,
        {
          kind,
          assignmentId,
          url: '/dispatch-board',
        },
      );
      this.gateway.notifyUser(user.id, 'notification', notification);
    }
  }

  private async alreadyNotified(
    userId: string,
    assignmentId: string,
    kind: string,
  ) {
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - REMINDER_LOOKBACK_MS) },
      },
      select: { data: true },
      take: 100,
    });
    return rows.some((row) => {
      const data = row.data as any;
      return data?.kind === kind && data?.assignmentId === assignmentId;
    });
  }

  private formatDateTime(date: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: HCM_TIMEZONE,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private tomorrowStart() {
    const start = this.startOfDay(new Date());
    start.setDate(start.getDate() + 1);
    return start;
  }

  private startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
