import { Injectable } from '@nestjs/common';
import { google, Auth } from 'googleapis';

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

/**
 * Creates/coordinates the OAuth2 client for Gmail.
 * The refresh token is stored in GmailAccount (per-account) — no fixed env value is used.
 */
@Injectable()
export class GmailAuthService {
  getOAuthClient(options?: { refreshToken?: string }): Auth.OAuth2Client {
    const client = new google.auth.OAuth2({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        `${process.env.BASE_URL || 'http://localhost:4000'}/api/gmail/callback`,
    });
    if (options?.refreshToken) {
      client.setCredentials({ refresh_token: options.refreshToken });
    }
    return client;
  }

  buildConnectUrl(state?: Record<string, unknown>): string {
    const client = this.getOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPES,
      // Pre-fill the only allowed mailbox on the consent screen.
      ...(process.env.GOOGLE_ALLOWED_EMAIL
        ? { login_hint: process.env.GOOGLE_ALLOWED_EMAIL }
        : {}),
      ...(state ? { state: JSON.stringify(state) } : {}),
    });
  }

  async exchangeCode(code: string): Promise<{
    refreshToken?: string;
    accessToken?: string;
  }> {
    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(code);
    return {
      refreshToken: tokens.refresh_token ?? undefined,
      accessToken: tokens.access_token ?? undefined,
    };
  }

  getGmailClient(refreshToken?: string) {
    return google.gmail({
      version: 'v1',
      auth: this.getOAuthClient({ refreshToken }),
    });
  }
}
