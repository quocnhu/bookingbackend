import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RawDataModule } from '@/raw-data/raw-data.module';
import { QueuesModule } from '@/queues/queues.module';
import { ParsingModule } from '@/parsing/parsing.module';
import { GoogleModule } from '@/google/google.module';
import { redisProvider } from './redis.provider';
import { GmailWatchService } from './gmail-watch.service';
import { GmailPubSubService } from './gmail-pubsub.service';
import { GmailSubscriberService } from './gmail-subscriber.service';
import { GmailPollService } from './gmail-poll.service';
import { GmailConnectService } from './gmail-connect.service';
import { GoogleOidcService } from './google-oidc.service';
import { GmailController } from './gmail.controller';

@Module({
  imports: [
    RawDataModule,
    QueuesModule,
    ParsingModule,
    GoogleModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [GmailController],
  providers: [
    redisProvider,
    GmailWatchService,
    GmailPubSubService,
    GmailSubscriberService,
    GmailPollService,
    GmailConnectService,
    GoogleOidcService,
  ],
  exports: [GoogleModule, GmailWatchService, GmailPubSubService],
})
export class IngestionModule {}
