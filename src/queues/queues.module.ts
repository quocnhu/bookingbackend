import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '@/audit/audit.module';
import { AssignmentBoardService } from './assignment-board.service';
import { BOOKING_MANUAL_QUEUE } from './queue.constants';
import { PARSE_QUEUE } from '@/parsing/parsing.queue';

/**
 * Module @Global đăng ký BullMQ root + tất cả queue dùng chung:
 * booking-manual (tạo thủ công), parse (Stage 2).
 * Processor của parse nằm ở parsing/parsing.processor.ts.
 * Assignment queue + Auto-assign engine đã được gỡ — xếp chuyến giờ chỉ bằng tay.
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
      { name: BOOKING_MANUAL_QUEUE },
      { name: PARSE_QUEUE },
    ),
  ],
  providers: [AssignmentBoardService],
  exports: [BullModule, AssignmentBoardService],
})
export class QueuesModule {}