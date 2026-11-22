import { Injectable } from '@nestjs/common';
import { AssignmentOrigin } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export const AUTO_DISPATCH_ENABLED_KEY = 'autoDispatchEnabled';
export const AUTO_DISPATCH_CRON_KEY = 'autoDispatchCron';
export const AUTO_MODE_ACTIVATED_AT_KEY = 'autoModeActivatedAt';
export const ASSIGN_MODE_KEY = 'assignMode';
export const DEFAULT_AUTO_DISPATCH_CRON = '0 23 * * *';
export const DEFAULT_DISPATCH_CUTOFF = '23:00';
export const DISPATCH_TIMEZONE = 'Asia/Ho_Chi_Minh';

const HCM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface SealInfo {
  sealed: boolean;
  urgent: boolean;
  autoMode: boolean;
  cutoffTime: string;
  cutoffAt: string;
  activatedAt: string | null;
  timezone: string;
}

/**
 * Single source of truth for the 23:00 dispatch seal.
 *
 * Auto mode = board Auto (`assignMode=AUTO_ASSIGN`) AND the scheduled
 * auto-dispatch switch are both on. A date is sealed once its cutoff (the
 * auto-dispatch time on the previous day) has passed, but only if auto mode
 * was already active before that cutoff — switching Auto on after 23:00
 * therefore applies from the next day, not retroactively.
 */
@Injectable()
export class DispatchPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getMode() {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            ASSIGN_MODE_KEY,
            AUTO_DISPATCH_ENABLED_KEY,
            AUTO_DISPATCH_CRON_KEY,
            AUTO_MODE_ACTIVATED_AT_KEY,
          ],
        },
      },
    });
    const map = new Map(rows.map((row) => [row.key, row.value]));

    const assignMode =
      map.get(ASSIGN_MODE_KEY) === AssignmentOrigin.MANUAL
        ? AssignmentOrigin.MANUAL
        : AssignmentOrigin.AUTO_ASSIGN;
    const enabled =
      (map.get(AUTO_DISPATCH_ENABLED_KEY) ?? 'true').toLowerCase() !== 'false';
    const cron = map.get(AUTO_DISPATCH_CRON_KEY) || DEFAULT_AUTO_DISPATCH_CRON;
    const activatedRaw = map.get(AUTO_MODE_ACTIVATED_AT_KEY);
    const activatedAt = activatedRaw ? new Date(activatedRaw) : null;

    return {
      autoMode: assignMode === AssignmentOrigin.AUTO_ASSIGN && enabled,
      assignMode,
      enabled,
      cron,
      cutoffTime: this.cronToCutoff(cron),
      activatedAt:
        activatedAt && !Number.isNaN(activatedAt.getTime())
          ? activatedAt
          : null,
    };
  }

  /** The seal/urgent state for a departure date. */
  async getSealInfo(startDate: Date | string): Promise<SealInfo> {
    const date = new Date(startDate);
    const mode = await this.getMode();
    const cutoff = this.cutoffFor(date, mode.cutoffTime);
    const activatedAt = mode.activatedAt ?? new Date(0);
    const now = Date.now();
    const sealed =
      mode.autoMode &&
      now >= cutoff.getTime() &&
      activatedAt.getTime() <= cutoff.getTime();
    const urgent = !sealed && now >= cutoff.getTime() - 3 * 60 * 60 * 1000;

    return {
      sealed,
      urgent,
      autoMode: mode.autoMode,
      cutoffTime: mode.cutoffTime,
      cutoffAt: cutoff.toISOString(),
      activatedAt: mode.activatedAt?.toISOString() ?? null,
      timezone: DISPATCH_TIMEZONE,
    };
  }

  async isSealed(startDate: Date | string | null | undefined): Promise<boolean> {
    if (!startDate) return false;
    return (await this.getSealInfo(startDate)).sealed;
  }

  /** Dispatch cutoff = configured daily auto-dispatch time on the previous HCM day. */
  cutoffFor(startDate: Date | string, cutoffTime?: string): Date {
    const date = new Date(startDate);
    const time = cutoffTime ?? DEFAULT_DISPATCH_CUTOFF;
    const { year, month, day } = this.hcmParts(date);
    const [hours, minutes] = (HHMM_PATTERN.test(time)
      ? time
      : DEFAULT_DISPATCH_CUTOFF
    )
      .split(':')
      .map(Number);
    const startOfDepartureDay =
      Date.UTC(year, month - 1, day) - HCM_OFFSET_MS;
    return new Date(
      startOfDepartureDay -
        DAY_MS +
        hours * 60 * 60 * 1000 +
        minutes * 60 * 1000,
    );
  }

  /** Start/end of the departure day in HCM (as real UTC instants). */
  dayRange(startDate: Date | string): { start: Date; end: Date } {
    const date = new Date(startDate);
    const { year, month, day } = this.hcmParts(date);
    const start = new Date(Date.UTC(year, month - 1, day) - HCM_OFFSET_MS);
    return { start, end: new Date(start.getTime() + DAY_MS - 1) };
  }

  /** YYYY-MM-DD key in HCM (used by waiting-list bus grouping). */
  dayKey(date: Date | string): string {
    const { year, month, day } = this.hcmParts(new Date(date));
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  todayHcm(): { start: Date; end: Date } {
    return this.dayRange(new Date());
  }

  addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
  }

  /** Late bookings can be placed on a real bus from 05:00 on the departure day. */
  latePlacementOpenAt(startDate: Date | string): Date {
    return new Date(this.dayRange(startDate).start.getTime() + 5 * 60 * 60 * 1000);
  }

  cronToCutoff(cron: string): string {
    const parts = (cron ?? '').trim().split(/\s+/);
    if (parts.length !== 5) return DEFAULT_DISPATCH_CUTOFF;
    const minute = Number(parts[0]);
    const hour = Number(parts[1]);
    if (
      !Number.isInteger(minute) ||
      !Number.isInteger(hour) ||
      minute < 0 ||
      minute > 59 ||
      hour < 0 ||
      hour > 23
    ) {
      return DEFAULT_DISPATCH_CUTOFF;
    }
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private hcmParts(date: Date) {
    const shifted = new Date(date.getTime() + HCM_OFFSET_MS);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
    };
  }
}
