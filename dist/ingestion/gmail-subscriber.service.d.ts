import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GmailPubSubService } from './gmail-pubsub.service';
export declare class GmailSubscriberService implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly gmailPubSub;
    private readonly logger;
    private subscription?;
    constructor(config: ConfigService, gmailPubSub: GmailPubSubService);
    onModuleInit(): void;
    private handleMessage;
    onModuleDestroy(): Promise<void>;
    private isEnabled;
    private parseProjectId;
}
