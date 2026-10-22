import { ConfigService } from '@nestjs/config';
import { PrismaService } from "../prisma/prisma.service";
import { GmailAuthService } from "../ingestion/gmail-auth.provider";
export interface BookingForwardInput {
    bookingRef: string;
    source?: string | null;
    action?: string | null;
    outcome?: string | null;
    mailbox: string;
    messageId?: string | null;
    threadId?: string | null;
    rfcMessageId?: string | null;
    subject?: string | null;
    from?: string | null;
    date?: string | null;
    body?: string | null;
}
export declare class BookingForwardService {
    private readonly prisma;
    private readonly config;
    private readonly auth;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, auth: GmailAuthService);
    forward(input: BookingForwardInput): Promise<{
        sent: boolean;
        reason?: string;
    }>;
    private buildRawMessage;
    private subjectFor;
    private threadMessageId;
    private textBody;
    private htmlBody;
    private encodeHeader;
    private base64Lines;
    private escapeHtml;
    private isEnabled;
    private recipients;
}
