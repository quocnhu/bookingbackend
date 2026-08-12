import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '@/audit/audit.module';
import { AssignmentProcessor } from './assignment.processor';
import { ASSIGNMENT_QUEUE, BOOKING_MANUAL_QUEUE } from './queue.constants';
import { PARSE_QUEUE } from '@/parsing/parsing.queue';

/**
 * Module @Global đăng ký BullMQ root + tất cả queue dùng chung:
 * assignment (tự xếp xe), booking-manual (tạo thủ công), parse (Stage 2).
 * Processor của parse nằm ở parsing/parsing.processor.ts.
 */
@Global()
@Module({
  imports: [
    AuditModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: ASSIGNMENT_QUEUE },
      { name: BOOKING_MANUAL_QUEUE },
      { name: PARSE_QUEUE },
    ),
  ],
  providers: [AssignmentProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
