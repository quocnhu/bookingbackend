import Redis from 'ioredis';
import { PrismaService } from '@/prisma/prisma.service';
import { RawDataService } from '@/raw-data/raw-data.service';
import { ParsingQueue } from '@/parsing/parsing.queue';
import { GmailAuthService } from './gmail-auth.provider';
import type { GmailPushPayload } from './dto/gmail-push-payload.dto';
export declare class GmailPubSubService {
    private readonly prisma;
    private readonly auth;
    private readonly rawDataService;
    private readonly parsingQueue;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, auth: GmailAuthService, rawDataService: RawDataService, parsingQueue: ParsingQueue, redis: Redis);
    handlePush(payload: GmailPushPayload): Promise<{
        handled: number;
        duplicates: number;
        ignored: boolean;
        nextHistoryId?: undefined;
    } | {
        handled: number;
        duplicates: number;
        nextHistoryId: string | null;
        ignored?: undefined;
    }>;
    testConnection(accountId: string): Promise<{
        ok: boolean;
        email: string;
        historyId: string | null | undefined;
    }>;
    private fetchMessage;
    private extractTextBody;
    private extractHtmlBody;
    private tagTemplate;
}
