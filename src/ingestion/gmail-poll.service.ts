import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { GmailPubSubService } from './gmail-pubsub.service';

/**
 * Polling transport (no Pub/Sub subscription required).
 *
 * When GMAIL_POLL_ENABLED=true, every GMAIL_POLL_INTERVAL_MS this calls the
 * SAME ingestion pipeline as the streaming pull / push webhook
 * (GmailPubSubService.handlePush) for every tracked mailbox, reading the Gmail
 * history API directly with the stored refresh token.
 *
 * This is a pure "pull from Gmail": it needs no GCP topic/subscription and no
 * inbound network access. The Redis dedup claim in handlePush() keeps it safe
 * to run alongside the other transports.
 */
@Injectable()
export class GmailPollService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GmailPollService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly gmailPubSub: GmailPubSubService,
  ) {}

  onModuleInit() {
    if (!this.isEnabled()) {
      this.logger.log('Gmail polling disabled (GMAIL_POLL_ENABLED != true)');
      return;
    }
    const interval = this.intervalMs();
    this.timer = setInterval(() => {
      void this.poll();
    }, interval);
    this.logger.log(`Gmail polling started — every ${interval}ms`);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      this.logger.log('Gmail polling stopped');
    }
  }

  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const accounts = await this.prisma.gmailAccount.findMany();
      for (const account of accounts) {
        try {
          const result = await this.gmailPubSub.handlePush({
            emailAddress: account.email,
            historyId: Number(account.lastHistoryId),
          });
          this.logger.log(`Polled ${account.email}: ${JSON.stringify(result)}`);
        } catch (err) {
          this.logger.error(
            `Poll failed for ${account.email}: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Gmail poll error: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private isEnabled(): boolean {
    const raw = this.config.get<string>('GMAIL_POLL_ENABLED');
    return (raw ?? 'false').toLowerCase() === 'true';
  }

  private intervalMs(): number {
    const n = Number(this.config.get<string>('GMAIL_POLL_INTERVAL_MS'));
    return Number.isFinite(n) && n >= 5000 ? n : 60_000;
  }
}
