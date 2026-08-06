import { Queue } from 'bullmq';
import { PrismaService } from "../prisma/prisma.service";
import { RawDataJob } from "../queues/raw-data.processor";
import { GoogleOidcService } from './google-oidc.service';
export declare class GmailService {
    private readonly prisma;
    private readonly googleOidcService;
    private readonly rawDataQueue;
    constructor(prisma: PrismaService, googleOidcService: GoogleOidcService, rawDataQueue: Queue<RawDataJob>);
    handleWebhook(authorizationHeader: string | undefined, body: any): Promise<{
        received: boolean;
        queued: boolean;
        historyId: any;
        emailAddress: any;
    }>;
    renewWatchIfNeeded(): Promise<{
        accounts: number;
        expiringSoon: number;
    }>;
}
