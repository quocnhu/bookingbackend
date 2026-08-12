export interface GmailPushMessage {
    message?: {
        data?: string;
        messageId?: string;
        publishTime?: string;
    };
}
export interface GmailPushPayload {
    emailAddress: string;
    historyId: number;
}
