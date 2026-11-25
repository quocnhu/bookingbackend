import { Global, Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { MailModule } from '@/mail/mail.module';
import { GuideConfirmationService } from './guide-confirmation.service';

@Global()
@Module({
  imports: [AuditModule, MailModule],
  providers: [GuideConfirmationService],
  exports: [GuideConfirmationService],
})
export class GuideConfirmationModule {}
