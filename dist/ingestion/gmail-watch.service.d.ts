import { PrismaService } from "../prisma/prisma.service";
import { GmailAuthService } from './gmail-auth.provider';
export declare class GmailWatchService {
    private readonly prisma;
    private readonly auth;
    private readonly logger;
    constructor(prisma: PrismaService, auth: GmailAuthService);
    registerWatch(refreshToken: string): Promise<Date | null>;
    registerWatchForAccount(accountId: string): Promise<{
        watchExpiration: Date | null;
    }>;
    renewExpiringWatches(): Promise<{
        checked: number;
        expiringSoon: number;
        renewed: number;
    }>;
}
