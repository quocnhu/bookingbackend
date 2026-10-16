import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub, Subscription, type Message } from '@google-cloud/pubsub';
import { GmailPubSubService } from './gmail-pubsub.service';
import type { GmailPushPayload } from './dto/gmail-push-payload.dto';

/**
 * Streaming pull transport (alternative to the push webhook).
 *
 * When GOOGLE_PUBSUB_PULL_ENABLED=true, this opens a long-lived streaming pull
 * on GOOGLE_PUBSUB_SUBSCRIPTION, decodes each Gmail watch notification
 * ({emailAddress, historyId}) and runs the SAME ingestion pipeline as the push
 * webhook (GmailPubSubService.handlePush). Messages are acked on success and
 * nacked (redelivered) on failure.
 *
 * NOTE: a subscription is either push OR pull — enable exactly one transport.
 * The Redis dedup claim in handlePush() keeps processing safe either way.
 */
@Injectable()
export class GmailSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GmailSubscriberService.name);
  private subscription?: Subscription;

  constructor(
    private readonly config: ConfigService,
    private readonly gmailPubSub: GmailPubSubService,
  ) {}

  onModuleInit() {
    const enabled = this.isEnabled();
    if (!enabled) {
      this.logger.log(
        'Streaming pull disabled (GOOGLE_PUBSUB_PULL_ENABLED != true) — using push webhook',
      );
      return;
    }

    const subName = this.config.get<string>('GOOGLE_PUBSUB_SUBSCRIPTION');
    if (!subName) {
      this.logger.warn(
        'GOOGLE_PUBSUB_PULL_ENABLED=true but GOOGLE_PUBSUB_SUBSCRIPTION is not set — skipping',
      );
      return;
    }

    try {
      const projectId =
        this.config.get<string>('GOOGLE_CLOUD_PROJECT') ??
        this.parseProjectId(subName);
      const keyFilename = this.config.get<string>(
        'GOOGLE_APPLICATION_CREDENTIALS',
      );

      const pubsub = new PubSub({
        ...(projectId ? { projectId } : {}),
        ...(keyFilename ? { keyFilename } : {}),
      });

      this.subscription = pubsub.subscription(subName, {
        flowControl: { maxMessages: 10 },
      });
      this.subscription.on('message', (message) => {
        void this.handleMessage(message);
      });
      this.subscription.on('error', (err: Error) => {
        this.logger.error(`Pub/Sub subscription error: ${err.message}`);
      });

      this.logger.log(`Streaming pull started on ${subName}`);
    } catch (err) {
      this.logger.error(
        `Failed to start streaming pull: ${(err as Error).message}`,
      );
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      const decoded = JSON.parse(message.data.toString('utf-8'));
      const payload: GmailPushPayload = {
        emailAddress: decoded.emailAddress,
        historyId: Number(decoded.historyId),
      };

      if (!payload.emailAddress || !payload.historyId) {
        this.logger.warn(
          'Invalid Pub/Sub payload (missing emailAddress/historyId) — acking',
        );
        message.ack();
        return;
      }

      const result = await this.gmailPubSub.handlePush(payload);
      this.logger.log(
        `Pulled notification for ${payload.emailAddress}: ${JSON.stringify(result)}`,
      );
      message.ack();
    } catch (err) {
      this.logger.error(
        `Failed to handle pulled message: ${(err as Error).message}`,
      );
      message.nack();
    }
  }

  async onModuleDestroy() {
    if (!this.subscription) return;
    try {
      await this.subscription.close();
      this.logger.log('Streaming pull stopped');
    } catch (err) {
      this.logger.warn(`Failed to close subscription: ${(err as Error).message}`);
    }
  }

  private isEnabled(): boolean {
    const raw = this.config.get<string>('GOOGLE_PUBSUB_PULL_ENABLED');
    return (raw ?? 'false').toLowerCase() === 'true';
  }

  /** Extract the project id from `projects/<id>/subscriptions/<name>`. */
  private parseProjectId(subName: string): string | undefined {
    const match = subName.match(/projects\/([^/]+)/);
    return match?.[1];
  }
}
