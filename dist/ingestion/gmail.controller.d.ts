import type { Response } from 'express';
import { GmailPubSubService } from './gmail-pubsub.service';
import { GmailConnectService } from './gmail-connect.service';
import { GmailWatchService } from './gmail-watch.service';
import { GoogleOidcService } from './google-oidc.service';
export declare class GmailController {
    private readonly pubSubService;
    private readonly connectService;
    private readonly watchService;
    private readonly oidcService;
    constructor(pubSubService: GmailPubSubService, connectService: GmailConnectService, watchService: GmailWatchService, oidcService: GoogleOidcService);
    webhook(authorization: string | undefined, body: any): Promise<{
        handled: number;
        duplicates: number;
        ignored: boolean;
        nextHistoryId?: undefined;
        received: boolean;
    } | {
        handled: number;
        duplicates: number;
        ignored: number;
        nextHistoryId: string | null;
        received: boolean;
    }>;
    connect(res: Response, accountId?: string): void;
    callback(code: string, state: string, res: Response): Promise<void>;
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
    remove(id: string): Promise<{
        success: boolean;
    }>;
    testConnection(id: string): Promise<{
        ok: boolean;
        email: string;
        historyId: string | null | undefined;
    }>;
    renewWatch(id: string): Promise<{
        watchExpiration: Date | null;
    }>;
    status(): Promise<{
        checked: number;
        expiringSoon: number;
        renewed: number;
    }>;
}
