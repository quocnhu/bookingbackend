import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingManualProcessor } from './booking-manual.processor';
import { BookingNormalizerService } from '@/parsing/booking-normalizer.service';
import { AuditModule } from '@/audit/audit.module';
import { QueuesModule } from '@/queues/queues.module';

@Module({
  imports: [AuditModule, QueuesModule],
  controllers: [BookingController],
  providers: [BookingService, BookingManualProcessor, BookingNormalizerService],
  exports: [BookingService, BookingNormalizerService],
})
export class BookingModule {}
