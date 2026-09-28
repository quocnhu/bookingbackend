import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutoCrewService } from '@/queues/auto-crew.service';
import { AssignmentsService } from './assignments.service';

/**
 * Cron 4:00 sáng (+07, timezone máy) — vận hành tự động trước khi xuất bến:
 * 1. Điền crew (HDV + tài xế) còn thiếu cho các chuyến hôm nay / sắp tới.
 * 2. Dispatch toàn bộ chuyến PENDING đang hoạt động hôm nay.
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