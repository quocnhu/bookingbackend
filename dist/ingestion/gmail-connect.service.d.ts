import { PrismaService } from '@/prisma/prisma.service';
import { GmailAuthService } from './gmail-auth.provider';
import { GmailWatchService } from './gmail-watch.service';
export declare class GmailConnectService {
    private readonly prisma;
    private readonly auth;
    private readonly watch;
    constructor(prisma: PrismaService, auth: GmailAuthService, watch: GmailWatchService);
    buildConnectUrl(accountId?: string): string;
    handleCallback(code: string, state?: string): Promise<{
        reconnected: boolean;
        email: string;
        watchExpiration: Date;
        connected?: undefined;
    } | {
        connected: boolean;
        email: string;
        watchExpiration: Date;
        reconnected?: undefined;
    }>;
    list(): Promise<{
        id: string;
        email: string;
        lastHistoryId: string;
        watchExpiration: Date;
        isWatchActive: boolean;
        expiresInDays: number;
        refreshTokenMasked: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    private maskToken;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
