import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '@/audit/audit.module';
import { RawDataProcessor } from './raw-data.processor';
import { BookingIngestProcessor } from './booking-ingest.processor';
import { BookingManualProcessor } from './booking-manual.processor';
import { AssignmentProcessor } from './assignment.processor';
import { BookingNormalizerService } from './booking-normalizer.service';
import { BookingWriterService } from './booking-writer.service';
import {
  ASSIGNMENT_QUEUE,
  BOOKING_INGEST_QUEUE,
  BOOKING_MANUAL_QUEUE,
  RAW_DATA_QUEUE,
} from './queue.constants';

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
      { name: RAW_DATA_QUEUE },
      { name: BOOKING_INGEST_QUEUE },
      { name: BOOKING_MANUAL_QUEUE },
      { name: ASSIGNMENT_QUEUE },
    ),
  ],
  providers: [
    RawDataProcessor,
    BookingIngestProcessor,
    BookingManualProcessor,
    AssignmentProcessor,
    BookingNormalizerService,
    BookingWriterService,
  ],
  exports: [BullModule, BookingWriterService, BookingNormalizerService],
})
export class QueuesModule {}
