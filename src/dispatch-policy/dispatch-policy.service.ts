import { Injectable } from '@nestjs/common';
import { AssignmentOrigin } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export const AUTO_DISPATCH_ENABLED_KEY = 'autoDispatchEnabled';
export const AUTO_DISPATCH_CRON_KEY = 'autoDispatchCron';
export const AUTO_MODE_ACTIVATED_AT_KEY = 'autoModeActivatedAt';
export const ASSIGN_MODE_KEY = 'assignMode';
export const DISPATCH_OPEN_KEY = 'dispatchOpenTime';
export const DEFAULT_AUTO_DISPATCH_CRON = '0 21 * * *';
export const DEFAULT_DISPATCH_CUTOFF = '21:00';
export const DEFAULT_DISPATCH_OPEN = '12:00';
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
  openTime: string;
  windowOpen: boolean;
  windowOpensAt: string;
  activatedAt: string | null;
  timezone: string;
}

export interface DispatchWindow {
  open: boolean;
  opensAt: Date;
  closesAt: Date;
  openTime: string;
  cutoffTime: string;
}

/**
 * Single source of truth for the day-before dispatch window and seal.
 *
 * Dispatch opens at 12:00 and closes at the configured cutoff (21:00 by
 * default) on the day BEFORE departure. Once the cutoff passes the departure
 * date is sealed in BOTH Manual and Auto mode: no new bus, passenger change or
 * date change is allowed (only waiting-list placement after 05:00). A bus that
 * is dispatched is sealed immediately, independently of the date.
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
            DISPATCH_OPEN_KEY,
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
    const openTimeRaw = map.get(DISPATCH_OPEN_KEY) ?? DEFAULT_DISPATCH_OPEN;
    const [openHours, openMinutes] = this.parseHhmm(openTimeRaw);
    const openTime = `${String(openHours).padStart(2, '0')}:${String(openMinutes).padStart(2, '0')}`;
    const activatedRaw = map.get(AUTO_MODE_ACTIVATED_AT_KEY);
    const activatedAt = activatedRaw ? new Date(activatedRaw) : null;

    return {
      autoMode: assignMode === AssignmentOrigin.AUTO_ASSIGN && enabled,
      assignMode,
      enabled,
      cron,
      cutoffTime: this.cronToCutoff(cron),
      openTime,
      activatedAt:
        activatedAt && !Number.isNaN(activatedAt.getTime())
          ? activatedAt
          : null,
    };
  }

  /** The seal/urgent state for a departure date. */
  async getSealInfo(startDate: Date | string): Promise<SealInfo> {
    const mode = await this.getMode();
    const window = this.dispatchWindow(
      startDate,
      mode.cutoffTime,
      mode.openTime,
    );
    const now = Date.now();
    const sealed = now >= window.closesAt.getTime();
    const urgent = !sealed && now >= window.closesAt.getTime() - 60 * 60 * 1000;

    return {
      sealed,
      urgent,
      autoMode: mode.autoMode,
      cutoffTime: window.cutoffTime,
      cutoffAt: window.closesAt.toISOString(),
      openTime: window.openTime,
      windowOpen: window.open,
      windowOpensAt: window.opensAt.toISOString(),
      activatedAt: mode.activatedAt?.toISOString() ?? null,
      timezone: DISPATCH_TIMEZONE,
    };
  }

  /**
   * Dispatch is allowed only between 12:00 and the cutoff on the HCM day
   * before departure. This is deliberately independent of the Auto/Manual
   * switch: in Manual mode the admin must also finish by the cutoff, and in
   * Auto mode the same window keeps the overnight job and the seal in sync.
   */
  dispatchWindow(
    startDate: Date | string,
    cutoffTime?: string,
    openTime?: string,
  ): DispatchWindow {
    const requested = cutoffTime ?? DEFAULT_DISPATCH_CUTOFF;
    const closesAt = this.cutoffFor(startDate, requested);
    const day = this.dayRange(closesAt);
    const [hours, minutes] = this.parseHhmm(openTime ?? DEFAULT_DISPATCH_OPEN);
    let opensAt = new Date(
      day.start.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000,
    );
    if (opensAt.getTime() >= closesAt.getTime()) {
      opensAt = new Date(closesAt.getTime() - 60 * 60 * 1000);
    }
    const [cutoffHours, cutoffMinutes] = this.parseHhmm(requested);
    const [openHours, openMinutes] = this.hcmClockParts(opensAt);
    const now = Date.now();
    return {
      open: now >= opensAt.getTime() && now <= closesAt.getTime(),
      opensAt,
      closesAt,
      openTime: `${String(openHours).padStart(2, '0')}:${String(openMinutes).padStart(2, '0')}`,
      cutoffTime: `${String(cutoffHours).padStart(2, '0')}:${String(cutoffMinutes).padStart(2, '0')}`,
    };
  }

  /** Async window lookup that includes the stored opening time. */
  async windowFor(
    startDate: Date | string,
    cutoffTime?: string,
  ): Promise<DispatchWindow> {
    const mode = await this.getMode();
    return this.dispatchWindow(startDate, cutoffTime ?? mode.cutoffTime, mode.openTime);
  }

  /** Stored open/cutoff times must leave a real dispatch window. */
  windowOrderIsValid(openTime: string, cutoffTime: string): boolean {
    const [openHours, openMinutes] = this.parseHhmm(openTime);
    const [cutoffHours, cutoffMinutes] = this.parseHhmm(cutoffTime);
    return openHours * 60 + openMinutes < cutoffHours * 60 + cutoffMinutes;
  }

  async isSealed(startDate: Date | string | null | undefined): Promise<boolean> {
    if (!startDate) return false;
    return (await this.getSealInfo(startDate)).sealed;
  }

  /** Dispatch cutoff = configured daily auto-dispatch time on the previous HCM day. */
  cutoffFor(startDate: Date | string, cutoffTime?: string): Date {
    const date = new Date(startDate);
    const { year, month, day } = this.hcmParts(date);
    const [hours, minutes] = this.parseHhmm(cutoffTime ?? DEFAULT_DISPATCH_CUTOFF);
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

  private parseHhmm(time?: string): [number, number] {
    const value = time ?? DEFAULT_DISPATCH_CUTOFF;
    if (!HHMM_PATTERN.test(value)) {
      const [h, m] = DEFAULT_DISPATCH_CUTOFF.split(':').map(Number);
      return [h, m];
    }
    const [h, m] = value.split(':').map(Number);
    return [h, m];
  }

  private hcmParts(date: Date) {
    const shifted = new Date(date.getTime() + HCM_OFFSET_MS);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
    };
  }

  private hcmClockParts(date: Date): [number, number] {
    const shifted = new Date(date.getTime() + HCM_OFFSET_MS);
    return [shifted.getUTCHours(), shifted.getUTCMinutes()];
  }
}
