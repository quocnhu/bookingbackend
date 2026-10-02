import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutoCrewService } from '@/queues/auto-crew.service';
import { AssignmentsService } from './assignments.service';

/**
 * Cron at 4:00 AM (+07, machine timezone) — runs automatically before departure:
 * 1. Fill in missing crew (guide + driver) for today's / upcoming trips.
 * 2. Dispatch all active PENDING trips for today.
 */
@Injectable()
export class AutoDispatchCron {
  private readonly logger = new Logger(AutoDispatchCron.name);

  constructor(
    private readonly autoCrewService: AutoCrewService,
    private readonly assignmentsService: AssignmentsService,
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

    try {
      const dispatch = await this.assignmentsService.dispatchAllBoard();
      this.logger.log(`Auto dispatch: dispatched=${dispatch.dispatched}`);
    } catch (error) {
      this.logger.error('Auto dispatch failed', (error as Error).stack);
    }
  }
}
