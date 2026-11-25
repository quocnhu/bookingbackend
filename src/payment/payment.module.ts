import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { MailModule } from '@/mail/mail.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { UnpaidBookingCleanupService } from './unpaid-booking-cleanup.service';

@Module({
  imports: [AuditModule, MailModule],
  controllers: [PaymentController],
  providers: [PaymentService, UnpaidBookingCleanupService],
  exports: [PaymentService],
})
export class PaymentModule {}
