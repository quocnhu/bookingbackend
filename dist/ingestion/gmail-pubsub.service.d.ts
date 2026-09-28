import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from "../prisma/prisma.service";
import { RawDataService } from "../raw-data/raw-data.service";
import { ParsingQueue } from "../parsing/parsing.queue";
import { GmailAuthService } from './gmail-auth.provider';
import type { GmailPushPayload } from './dto/gmail-push-payload.dto';
export declare class GmailPubSubService {
    private readonly prisma;
    private readonly auth;
    private readonly rawDataService;
    private readonly parsingQueue;
    private readonly config;
    private readonly redis;
    private readonly logger;
    private allowedSendersCache;
    constructor(prisma: PrismaService, auth: GmailAuthService, rawDataService: RawDataService, parsingQueue: ParsingQueue, config: ConfigService, redis: Redis);
    handlePush(payload: GmailPushPayload): Promise<{
        handled: number;
        duplicates: number;
        ignored: boolean;
        nextHistoryId?: undefined;
    } | {
        handled: number;
        duplicates: number;
        ignored: number;
        nextHistoryId: string | null;
    }>;
    testConnection(accountId: string): Promise<{
        ok: boolean;
        email: string;
        historyId: string | null | undefined;
    }>;
    private fetchMessage;
    private extractTextBody;
    private extractHtmlBody;
    private get allowedSenders();
    private isAllowedSender;
    private tagTemplate;
}
