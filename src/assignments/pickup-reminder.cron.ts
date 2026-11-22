import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AssignmentStatus,
  BookingProvider,
  BookingStatus,
  PickupReminderMode,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { MailService } from '@/mail/mail.service';
import {
  bookingPickupMinutes,
  DEFAULT_PICKUP_REMINDER_TIME,
  hcmDateKey,
  hcmTimeMinutes,
  hhmmToMinutes,
  isValidHhmm,
  PICKUP_REMINDER_TIME_ZONE,
  shouldSendReminderNow,
} from './pickup-reminder.util';

export const PICKUP_REMINDER_ENABLED_KEY = 'pickupReminderEnabled';
export const PICKUP_REMINDER_TIME_KEY = 'pickupReminderTime';

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const REMINDER_CHANNELS = new Set<BookingProvider>([
  BookingProvider.WEBSITE,
  BookingProvider.MANUAL,
]);

export interface PickupReminderSettings {
  enabled: boolean;
  time: string;
  timezone: string;
}

/**
 * Sends the customer pre-pickup reminder (tour + guide + pickup time).
 *
 * Runs every 10 minutes in Asia/Ho_Chi_Minh. The configured time (default
 * 06:00) is used on the tour day, but it is pulled earlier when necessary so
 * the mail always arrives before the earliest pickup.
 *
 * Only assignments whose `pickupReminderMode` is AUTO are handled; MANUAL
 * assignments wait for the "Send reminder" button on the Dispatch Board.
 */
@Injectable()
export class PickupReminderCron {
  private readonly logger = new Logger(PickupReminderCron.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  @Cron('*/10 * * * *', { timeZone: PICKUP_REMINDER_TIME_ZONE })
  async scheduled() {
    try {
      const result = await this.runNow();
      if (result.checked > 0) {
        this.logger.log(
          `Pickup reminders: checked=${result.checked}, sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`,
        );
      }
    } catch (error) {
      this.logger.error('Pickup reminder cron failed', (error as Error).stack);
    }
  }

  async runNow(now: Date = new Date()) {
    if (this.running) return { checked: 0, sent: 0, failed: 0, skipped: 0 };
    this.running = true;
    try {
      const settings = await this.getSettings();
      if (!settings.enabled) {
        return { checked: 0, sent: 0, failed: 0, skipped: 0 };
      }
      const configured = hhmmToMinutes(settings.time);
      if (configured == null) {
        this.logger.warn(
          `Invalid pickup reminder time "${settings.time}" — skipping`,
        );
        return { checked: 0, sent: 0, failed: 0, skipped: 0 };
      }

      const todayKey = hcmDateKey(now);
      const nowMinutes = hcmTimeMinutes(now);
      const windowStart = new Date(now.getTime() - 36 * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000);

      const assignments = await this.prisma.assignment.findMany({
        where: {
          startDate: { gte: windowStart, lte: windowEnd },
          pickupReminderMode: PickupReminderMode.AUTO,
          status: {
            in: [
              AssignmentStatus.DRAFT_ASSIGNED,
              AssignmentStatus.PENDING,
              AssignmentStatus.TRANSFERRED,
              AssignmentStatus.DISPATCHED,
            ],
          },
        },
        select: {
          id: true,
          code: true,
          tourName: true,
          startDate: true,
          tourType: true,
          bookings: {
            where: {
              parentBookingId: null,
              status: { not: BookingStatus.CANCELED },
            },
            select: {
              id: true,
              mail: true,
              channel: true,
              departureTime: true,
              pickupReminderSentAt: true,
              tour: { select: { departureTimes: true } },
            },
          },
        },
      });

      let checked = 0;
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const assignment of assignments) {
        if (hcmDateKey(assignment.startDate) !== todayKey) continue;

        const eligible = assignment.bookings.filter(
          (b) =>
            REMINDER_CHANNELS.has(b.channel) &&
            EMAIL_RE.test((b.mail ?? '').trim()),
        );
        if (eligible.length === 0) continue;

        const unsent = eligible.filter((b) => !b.pickupReminderSentAt);
        if (unsent.length === 0) continue;

        const earliestPickup = eligible.reduce<number | null>((min, b) => {
          const minutes = bookingPickupMinutes(
            b.departureTime,
            b.tour?.departureTimes,
          );
          if (minutes == null) return min;
          return min == null ? minutes : Math.min(min, minutes);
        }, null);

        if (
          !shouldSendReminderNow({
            nowMinutes,
            configuredMinutes: configured,
            earliestPickupMinutes: earliestPickup,
          })
        ) {
          continue;
        }

        checked++;
        const result = await this.mail.sendPickupReminders(assignment.id);
        sent += result.sent;
        failed += result.failed;
        skipped += result.skipped;
        if (result.reason && result.sent === 0) {
          this.logger.warn(
            `Pickup reminder for ${assignment.tourName ?? assignment.code ?? assignment.id} skipped: ${result.reason}`,
          );
        }
      }

      return { checked, sent, failed, skipped };
    } finally {
      this.running = false;
    }
  }

  async getSettings(): Promise<PickupReminderSettings> {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: { in: [PICKUP_REMINDER_ENABLED_KEY, PICKUP_REMINDER_TIME_KEY] },
      },
    });
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const enabled =
      (map.get(PICKUP_REMINDER_ENABLED_KEY) ?? 'true').toLowerCase() !==
      'false';
    let time =
      map.get(PICKUP_REMINDER_TIME_KEY) ?? DEFAULT_PICKUP_REMINDER_TIME;
    if (!isValidHhmm(time)) time = DEFAULT_PICKUP_REMINDER_TIME;
    return { enabled, time, timezone: PICKUP_REMINDER_TIME_ZONE };
  }

  async updateSettings(
    input: { enabled?: boolean; time?: string },
    actorId?: string | null,
  ): Promise<PickupReminderSettings> {
    if (input.time !== undefined && !isValidHhmm(input.time)) {
      throw new BadRequestException('Time must be HH:mm (e.g. 06:00)');
    }
    const before = await this.getSettings();
    const updates: Array<{ key: string; value: string }> = [];
    if (input.enabled !== undefined) {
      updates.push({
        key: PICKUP_REMINDER_ENABLED_KEY,
        value: input.enabled ? 'true' : 'false',
      });
    }
    if (input.time !== undefined) {
      updates.push({ key: PICKUP_REMINDER_TIME_KEY, value: input.time.trim() });
    }
    for (const entry of updates) {
      await this.prisma.systemSetting.upsert({
        where: { key: entry.key },
        update: { value: entry.value },
        create: entry,
      });
    }
    const after = await this.getSettings();
    await this.audit.log({
      entityType: 'SystemSetting',
      entityId: PICKUP_REMINDER_TIME_KEY,
      action: 'UPDATE_PICKUP_REMINDER',
      beforeData: before,
      afterData: after,
      changedBy: actorId ?? null,
    });
    this.logger.log(
      `Pickup reminder ${after.enabled ? 'enabled' : 'disabled'} at ${after.time} (${after.timezone})`,
    );
    return after;
  }
}
