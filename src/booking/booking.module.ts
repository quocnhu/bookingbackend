import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingManualProcessor } from './booking-manual.processor';
import { BookingForwardService } from './booking-forward.service';
import { BookingNormalizerService } from '@/parsing/booking-normalizer.service';
import { AuditModule } from '@/audit/audit.module';
import { QueuesModule } from '@/queues/queues.module';
import { GoogleModule } from '@/google/google.module';
import { redisProvider } from '@/ingestion/redis.provider';

@Module({
  imports: [AuditModule, QueuesModule, GoogleModule],
  controllers: [BookingController],
  providers: [
    redisProvider,
    BookingService,
    BookingManualProcessor,
    BookingNormalizerService,
    BookingForwardService,
  ],
  exports: [BookingService, BookingNormalizerService, BookingForwardService],
})
export class BookingModule {}
