import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from "../prisma/prisma.service";
import { GmailPubSubService } from './gmail-pubsub.service';
export declare class GmailPollService implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly prisma;
    private readonly gmailPubSub;
    private readonly logger;
    private timer?;
    private running;
    constructor(config: ConfigService, prisma: PrismaService, gmailPubSub: GmailPubSubService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    poll(): Promise<void>;
    private isEnabled;
    private intervalMs;
}
