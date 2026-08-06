import { Module } from '@nestjs/common';
import { GmailController } from './gmail.controller';
import { GmailService } from './gmail.service';
import { GoogleOidcService } from './google-oidc.service';
import { QueuesModule } from '@/queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [GmailController],
  providers: [GmailService, GoogleOidcService],
  exports: [GmailService],
})
export class GmailModule {}
