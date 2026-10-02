import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/decorators/public.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { GmailPubSubService } from './gmail-pubsub.service';
import { GmailConnectService } from './gmail-connect.service';
import { GmailWatchService } from './gmail-watch.service';
import { GoogleOidcService } from './google-oidc.service';
import type { GmailPushPayload } from './dto/gmail-push-payload.dto';

@Controller('gmail')
export class GmailController {
  constructor(
    private readonly pubSubService: GmailPubSubService,
    private readonly connectService: GmailConnectService,
    private readonly watchService: GmailWatchService,
    private readonly oidcService: GoogleOidcService,
  ) {}

  /** Push subscription endpoint — Gmail → Pub/Sub → here (public, verify OIDC). */
  @Public()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post('webhook')
  async webhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: any,
  ) {
    if (!authorization) {
      throw new BadRequestException('Missing Authorization header');
    }
    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new BadRequestException('Invalid Authorization header');
    }

    // Verify the Google OIDC JWT before processing.
    await this.oidcService.verifyIdToken(token);

    const message = body?.message;
    if (!message?.data) {
      throw new BadRequestException('Missing message.data');
    }

    const decoded = JSON.parse(
      Buffer.from(message.data, 'base64').toString('utf-8'),
    );
    const payload: GmailPushPayload = {
      emailAddress: decoded.emailAddress,
      historyId: Number(decoded.historyId),
    };
    if (!payload.emailAddress || !payload.historyId) {
      throw new BadRequestException('Missing emailAddress or historyId');
    }

    const result = await this.pubSubService.handlePush(payload);
    return { received: true, ...result };
  }

  /** Start the OAuth flow to connect/reconnect a mailbox. */
  @Permissions('gmail.manage')
  @Get('connect')
  connect(@Res() res: Response, @Query('accountId') accountId?: string) {
    return res.redirect(this.connectService.buildConnectUrl(accountId));
  }

  /** Google redirects here after the user grants permission. */
  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const result = await this.connectService.handleCallback(code, state);
      const isReconnect = 'reconnected' in result;
      const status = encodeURIComponent(
        `${isReconnect ? 'Reconnected' : 'Tracked'} ${result.email}${
          result.watchExpiration ? ' · watch active' : ''
        }`,
      );
      return res.redirect(
        `${frontendUrl}/users?mailbox=${isReconnect ? 'reconnected' : 'connected'}&message=${status}`,
      );
    } catch (err: any) {
      const message = encodeURIComponent(
        err?.message?.replace?.(/\s+/g, ' ').slice(0, 120) ||
          'Mailbox connect failed',
      );
      return res.redirect(
        `${frontendUrl}/users?mailbox=error&message=${message}`,
      );
    }
  }

  /** List of tracked mailboxes. */
  @Permissions('gmail.manage')
  @Get('accounts')
  list() {
    return this.connectService.list();
  }

  /** Remove a mailbox. */
  @Permissions('gmail.manage')
  @Delete('accounts/:id')
  remove(@Param('id') id: string) {
    return this.connectService.remove(id);
  }

  /** Test refresh token: call the Gmail API to confirm the token is still valid. */
  @Permissions('gmail.manage')
  @Post('accounts/:id/test')
  testConnection(@Param('id') id: string) {
    return this.pubSubService.testConnection(id);
  }

  /** Renew a mailbox's watch immediately (manually). */
  @Permissions('gmail.manage')
  @Post('accounts/:id/renew-watch')
  renewWatch(@Param('id') id: string) {
    return this.watchService.registerWatchForAccount(id);
  }

  /** Test endpoint: renew watches that are about to expire + rawData statistics. */
  @Permissions('gmail.manage')
  @Get('status')
  status() {
    return this.watchService.renewExpiringWatches();
  }
}
