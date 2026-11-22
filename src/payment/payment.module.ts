import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { MailModule } from '@/mail/mail.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [AuditModule, MailModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
