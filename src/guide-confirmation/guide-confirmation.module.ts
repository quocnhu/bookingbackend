import { Global, Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { MailModule } from '@/mail/mail.module';
import { GuideConfirmationController } from './guide-confirmation.controller';
import { GuideConfirmationService } from './guide-confirmation.service';

@Global()
@Module({
  imports: [AuditModule, MailModule],
  controllers: [GuideConfirmationController],
  providers: [GuideConfirmationService],
  exports: [GuideConfirmationService],
})
export class GuideConfirmationModule {}
