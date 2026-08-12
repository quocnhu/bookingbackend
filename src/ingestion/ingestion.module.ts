import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RawDataModule } from '@/raw-data/raw-data.module';
import { QueuesModule } from '@/queues/queues.module';
import { ParsingModule } from '@/parsing/parsing.module';
import { redisProvider } from './redis.provider';
import { GmailAuthService } from './gmail-auth.provider';
import { GmailWatchService } from './gmail-watch.service';
import { GmailPubSubService } from './gmail-pubsub.service';
import { GmailConnectService } from './gmail-connect.service';
import { GoogleOidcService } from './google-oidc.service';
import { GmailController } from './gmail.controller';

@Module({
  imports: [
    RawDataModule,
    QueuesModule,
    ParsingModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [GmailController],
  providers: [
    redisProvider,
    GmailAuthService,
    GmailWatchService,
    GmailPubSubService,
    GmailConnectService,
    GoogleOidcService,
  ],
  exports: [GmailAuthService, GmailWatchService, GmailPubSubService],
})
export class IngestionModule {}
