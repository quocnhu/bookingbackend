import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';
import { AssignmentOrigin } from '@prisma/client';
import { AutoCrewService } from '@/queues/auto-crew.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { AssignmentsService } from './assignments.service';

export const AUTO_DISPATCH_ENABLED_KEY = 'autoDispatchEnabled';
export const AUTO_DISPATCH_CRON_KEY = 'autoDispatchCron';
export const DEFAULT_AUTO_DISPATCH_CRON = '0 4 * * *';
export const AUTO_DISPATCH_TIMEZONE =
  process.env.AUTO_DISPATCH_TIMEZONE || 'Asia/Ho_Chi_Minh';

const AUTO_DISPATCH_JOB = 'auto-dispatch';

export interface AutoDispatchSettings {
  enabled: boolean;
  cron: string;
  timezone: string;
  nextRun: string | null;
}

/**
 * Scheduled auto-dispatch. The time and on/off switch are stored in
 * `SystemSetting` (`autoDispatchCron`, `autoDispatchEnabled`) and the job is
 * registered dynamically through `SchedulerRegistry`, so changes apply at
 * runtime without a restart.
 *
 * At each run (default 04:00 Asia/Ho_Chi_Minh):
 * 1. Fill in missing crew (guide + driver) for upcoming trips.
 * 2. Dispatch all active PENDING trips for today (AUTO mode only —
 *    MANUAL never auto-dispatches; admin dispatches by hand).
 * Disabling the switch skips the whole scheduled run.
 */
@Injectable()
export class AutoDispatchCron implements OnModuleInit {
  private readonly logger = new Logger(AutoDispatchCron.name);

  constructor(
    private readonly autoCrewService: AutoCrewService,
    private readonly assignmentsService: AssignmentsService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    try {
      const settings = await this.ensureSettings();
      this.reschedule(settings.cron);
      this.logger.log(
        `Auto-dispatch ${settings.enabled ? 'enabled' : 'disabled'} at "${settings.cron}" (${AUTO_DISPATCH_TIMEZONE}) — next run: ${this.getNextRun() ?? 'n/a'}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize auto-dispatch schedule',
        (error as Error).stack,
      );
    }
  }

  async getSettings(): Promise<AutoDispatchSettings> {
    const settings = await this.ensureSettings();
    return { ...settings, timezone: AUTO_DISPATCH_TIMEZONE, nextRun: this.getNextRun() };
  }

  async updateSettings(
    input: { enabled?: boolean; cron?: string },
    actorId?: string | null,
  ): Promise<AutoDispatchSettings> {
    const before = await this.getSettings();

    if (input.cron !== undefined) {
      this.validateCron(input.cron);
    }

    const updates: Array<{ key: string; value: string }> = [];
    if (input.enabled !== undefined) {
      updates.push({
        key: AUTO_DISPATCH_ENABLED_KEY,
        value: input.enabled ? 'true' : 'false',
      });
    }
    if (input.cron !== undefined) {
      updates.push({ key: AUTO_DISPATCH_CRON_KEY, value: input.cron.trim() });
    }

    for (const entry of updates) {
      await this.prisma.systemSetting.upsert({
        where: { key: entry.key },
        update: { value: entry.value },
        create: entry,
      });
    }

    if (input.cron !== undefined) {
      this.reschedule(input.cron.trim());
    }
    const after = await this.getSettings();

    await this.auditService.log({
      entityType: 'SystemSetting',
      entityId: AUTO_DISPATCH_CRON_KEY,
      action: 'UPDATE_AUTO_DISPATCH',
      beforeData: before,
      afterData: after,
      changedBy: actorId ?? null,
    });

    this.logger.log(
      `Auto-dispatch ${after.enabled ? 'enabled' : 'disabled'} at "${after.cron}" — next run: ${after.nextRun ?? 'n/a'}`,
    );
    return after;
  }

  private async ensureSettings(): Promise<{ enabled: boolean; cron: string }> {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: { in: [AUTO_DISPATCH_ENABLED_KEY, AUTO_DISPATCH_CRON_KEY] },
      },
    });
    const map = new Map(rows.map((row) => [row.key, row.value]));

    let cron = map.get(AUTO_DISPATCH_CRON_KEY) ?? DEFAULT_AUTO_DISPATCH_CRON;
    try {
      this.validateCron(cron);
    } catch {
      this.logger.warn(
        `Invalid stored auto-dispatch cron "${cron}" — falling back to "${DEFAULT_AUTO_DISPATCH_CRON}"`,
      );
      cron = DEFAULT_AUTO_DISPATCH_CRON;
    }

    const enabled =
      (map.get(AUTO_DISPATCH_ENABLED_KEY) ?? 'true').toLowerCase() !== 'false';

    const defaults: Array<{ key: string; value: string }> = [];
    if (!map.has(AUTO_DISPATCH_CRON_KEY)) {
      defaults.push({ key: AUTO_DISPATCH_CRON_KEY, value: cron });
    }
    if (!map.has(AUTO_DISPATCH_ENABLED_KEY)) {
      defaults.push({
        key: AUTO_DISPATCH_ENABLED_KEY,
        value: enabled ? 'true' : 'false',
      });
    }
    for (const entry of defaults) {
      await this.prisma.systemSetting.upsert({
        where: { key: entry.key },
        update: {},
        create: entry,
      });
    }

    return { enabled, cron };
  }

  private validateCron(cron: string) {
    if (!cron || !cron.trim()) {
      throw new BadRequestException('Cron expression is required');
    }
    try {
      new CronTime(cron.trim(), AUTO_DISPATCH_TIMEZONE);
    } catch {
      throw new BadRequestException(
        `Invalid cron expression "${cron}". Example: "0 4 * * *" (daily at 04:00).`,
      );
    }
  }

  private reschedule(cron: string) {
    if (this.schedulerRegistry.doesExist('cron', AUTO_DISPATCH_JOB)) {
      this.schedulerRegistry.deleteCronJob(AUTO_DISPATCH_JOB);
    }
    const job = CronJob.from({
      cronTime: cron,
      onTick: () => this.runScheduledDispatch(),
      start: true,
      timeZone: AUTO_DISPATCH_TIMEZONE,
    });
    this.schedulerRegistry.addCronJob(AUTO_DISPATCH_JOB, job);
  }

  private getNextRun(): string | null {
    try {
      const job = this.schedulerRegistry.getCronJob(AUTO_DISPATCH_JOB);
      return job.nextDate().toJSDate().toISOString();
    } catch {
      return null;
    }
  }

  private async runScheduledDispatch() {
    const settings = await this.ensureSettings();
    if (!settings.enabled) {
      this.logger.log('Auto-dispatch disabled — skipping scheduled run');
      return;
    }

    this.logger.log('Auto-dispatch started: auto crew + dispatch');
    try {
      const crewResult = await this.autoCrewService.assignMissingCrew();
      this.logger.log(
        `Auto crew: scanned=${crewResult.scanned}, guide+${crewResult.guideAssigned}, driver+${crewResult.driverAssigned}`,
      );
    } catch (error) {
      this.logger.error('Auto crew failed', (error as Error).stack);
    }

    // The single behavioral difference between the modes: MANUAL skips the
    // automatic dispatch. Everything else (bus init, crew fill) is shared.
    const modeRow = await this.prisma.systemSetting.findUnique({
      where: { key: 'assignMode' },
    });
    if (modeRow?.value === AssignmentOrigin.MANUAL) {
      this.logger.log('Manual mode — skipping auto-dispatch (admin dispatches by hand)');
      return;
    }

    try {
      const dispatch = await this.assignmentsService.dispatchAllBoard();
      this.logger.log(`Auto dispatch: dispatched=${dispatch.dispatched}`);
    } catch (error) {
      this.logger.error('Auto dispatch failed', (error as Error).stack);
    }
  }
}
