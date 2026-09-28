import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '@/audit/audit.module';
import { LeavesModule } from '@/leaves/leaves.module';
import { AssignmentBoardService } from './assignment-board.service';
import { AssignmentQueue } from './assignment.queue';
import { AssignmentProcessor } from './assignment.processor';
import { AutoCrewService } from './auto-crew.service';
import { ASSIGN_QUEUE, BOOKING_MANUAL_QUEUE } from './queue.constants';
import { PARSE_QUEUE } from '@/parsing/parsing.queue';

/**
 * Module @Global đăng ký BullMQ root + tất cả queue dùng chung:
 * booking-manual (tạo thủ công), parse (Stage 2), assign (Stage 3 - auto-assign).
 * Processor của parse nằm ở parsing/parsing.processor.ts.
 * Processor của assign nằm ở queues/assignment.processor.ts.
 */
@Global()
@Module({
  imports: [
    AuditModule,
    LeavesModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: BOOKING_MANUAL_QUEUE },
      { name: PARSE_QUEUE },
      { name: ASSIGN_QUEUE },
    ),
  ],
  providers: [AssignmentBoardService, AssignmentQueue, AssignmentProcessor, AutoCrewService],
  exports: [BullModule, AssignmentBoardService, AssignmentQueue, AutoCrewService],
})
export class QueuesModule {}