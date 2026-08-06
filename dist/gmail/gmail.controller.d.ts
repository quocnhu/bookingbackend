import { GmailService } from './gmail.service';
export declare class GmailController {
    private readonly gmailService;
    constructor(gmailService: GmailService);
    webhook(authorization: string | undefined, body: any): Promise<{
        received: boolean;
        queued: boolean;
        historyId: any;
        emailAddress: any;
    }>;
}
