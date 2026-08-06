import { Injectable, UnauthorizedException } from '@nestjs/common';
import { google } from 'googleapis';

interface OidcPayload {
  iss: string;
  aud: string;
  exp: number;
  email?: string;
}

@Injectable()
export class GoogleOidcService {
  /**
   * Verify Google OIDC JWT từ header Authorization của Pub/Sub push.
   * Kiểm tra issuer accounts.google.com + aud = topic/subscription + chưa hết hạn.
   */
  async verifyIdToken(token: string): Promise<OidcPayload> {
    const allowedAuds = this.getAllowedAudiences();

    const verifyOptions: any = {
      audience: allowedAuds,
    };

    try {
      const oauth2 = google.oauth2({ version: 'v2' });
      const tokeninfo = await oauth2.tokeninfo({ id_token: token });

      const payload = tokeninfo.data as any;
      if (!payload || payload.iss !== 'https://accounts.google.com') {
        throw new UnauthorizedException('Invalid OIDC issuer');
      }
      const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!aud.some((a: string) => allowedAuds.includes(a))) {
        throw new UnauthorizedException('Invalid OIDC audience');
      }
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException('OIDC token expired');
      }
      return payload as OidcPayload;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Failed to verify OIDC token');
    }
  }

  private getAllowedAudiences(): string[] {
    const auds = [
      process.env.GOOGLE_PUBSUB_TOPIC,
      process.env.GOOGLE_PUBSUB_SUBSCRIPTION,
      process.env.GOOGLE_CLIENT_ID,
    ].filter(Boolean);
    return auds as string[];
  }
}
