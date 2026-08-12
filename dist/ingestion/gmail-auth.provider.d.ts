import { Auth } from 'googleapis';
export declare class GmailAuthService {
    getOAuthClient(options?: {
        refreshToken?: string;
    }): Auth.OAuth2Client;
    buildConnectUrl(state?: Record<string, unknown>): string;
    exchangeCode(code: string): Promise<{
        refreshToken?: string;
        accessToken?: string;
    }>;
    getGmailClient(refreshToken?: string): import("googleapis").gmail_v1.Gmail;
}
