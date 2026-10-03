import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AssignmentOrigin } from '@prisma/client';
import { AutoCrewService } from '@/queues/auto-crew.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AssignmentsService } from './assignments.service';

/**
 * Cron at 4:00 AM (+07, machine timezone) — runs automatically before departure:
 * 1. Fill in missing crew (guide + driver) for today's / upcoming trips (both modes).
 * 2. Dispatch all active PENDING trips for today (AUTO mode only —
 *    MANUAL never auto-dispatches; admin dispatches by hand).
 */
@Injectable()
export class AutoDispatchCron {
  private readonly logger = new Logger(AutoDispatchCron.name);

  constructor(
    private readonly autoCrewService: AutoCrewService,
    private readonly assignmentsService: AssignmentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async autoDispatchAt4am() {
    this.logger.log('4am cron started: auto crew + dispatch');
    try {
      const crewResult = await this.autoCrewService.assignMissingCrew();
      this.logger.log(
        `Auto crew: scanned=${crewResult.scanned}, guide+${crewResult.guideAssigned}, driver+${crewResult.driverAssigned}`,
      );
    } catch (error) {
      this.logger.error('Auto crew failed', (error as Error).stack);
    }

    // The single behavioral difference between the modes: MANUAL skips the
    // automatic 4am dispatch. Everything else (bus init, crew fill) is shared.
    const modeRow = await this.prisma.systemSetting.findUnique({
      where: { key: 'assignMode' },
    });
    if (modeRow?.value === AssignmentOrigin.MANUAL) {
      this.logger.log('Manual mode — skipping 4am auto-dispatch (admin dispatches by hand)');
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
