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
 * Streaming pull transport (the ONLY realtime transport of this project — no
 * push webhook is used).
 *
 * When GOOGLE_PUBSUB_PULL_ENABLED=true, this opens a long-lived streaming pull
 * on GOOGLE_PUBSUB_SUBSCRIPTION, decodes each Gmail watch notification
 * ({emailAddress, historyId}) and runs the SAME ingestion pipeline as the
 * polling transport (GmailPubSubService.handlePush). Messages are acked on
 * success and nacked (redelivered) on failure.
 *
 * The service is self-healing: if the subscription is missing (GCP returns
 * NOT_FOUND — e.g. it was deleted or never created) it logs ONE actionable
 * error, then re-checks every GOOGLE_PUBSUB_RECONNECT_MS. Creating the
 * subscription in the GCP console is therefore enough — the stream connects on
 * the next retry without a backend restart.
 *
 * When GOOGLE_PUBSUB_AUTO_CREATE_SUBSCRIPTION=true it first tries to create the
 * subscription itself (needs pubsub.subscriptions.create on the project, i.e.
 * roles/pubsub.editor or roles/pubsub.admin for the service account).
 *
 * NOTE: a subscription is either push OR pull. The Redis dedup claim in
 * handlePush() keeps the polling transport safe to run alongside this one.
 */
@Injectable()
export class GmailSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GmailSubscriberService.name);

  private pubsub?: PubSub;
  private subscription?: Subscription;
  private reconnectTimer?: NodeJS.Timeout;
  private attempts = 0;
  private connecting = false;
  private destroyed = false;
  /** The actionable error is logged once, not on every retry. */
  private failureLogged = false;
  /** Repeat warnings are throttled so a missing subscription cannot flood logs. */
  private lastWarningAt = 0;
  private static readonly WARNING_INTERVAL_MS = 5 * 60_000;

  constructor(
    private readonly config: ConfigService,
    private readonly gmailPubSub: GmailPubSubService,
  ) {}

  onModuleInit() {
    if (!this.isEnabled()) {
      this.logger.log(
        'Streaming pull disabled (GOOGLE_PUBSUB_PULL_ENABLED != true)',
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

    const projectId =
      this.config.get<string>('GOOGLE_CLOUD_PROJECT') ??
      this.parseProjectId(subName);
    const keyFilename = this.config.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );

    try {
      this.pubsub = new PubSub({
        ...(projectId ? { projectId } : {}),
        ...(keyFilename ? { keyFilename } : {}),
      });
    } catch (err) {
      this.logger.error(
        `Streaming pull: invalid Pub/Sub credentials (${(err as Error).message})`,
      );
      return;
    }

    void this.connect();
  }

  /** Ensure the subscription exists, then (re)open the streaming pull. */
  private async connect(): Promise<void> {
    if (this.connecting || this.destroyed || !this.pubsub) return;
    this.connecting = true;
    this.attempts++;

    const subName = this.config.get<string>('GOOGLE_PUBSUB_SUBSCRIPTION')!;

    try {
      const ready = await this.ensureSubscription(subName);
      if (!ready) {
        this.scheduleReconnect();
        return;
      }
      this.openStream(subName);
    } catch (err) {
      this.reportFailure(err as Error, subName);
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  /**
   * True when the subscription exists (or was created just now).
   * False when it does not exist and cannot be created automatically.
   */
  private async ensureSubscription(subName: string): Promise<boolean> {
    const pubsub = this.pubsub!;
    const sub = pubsub.subscription(subName);

    try {
      const [exists] = await sub.exists();
      if (exists) {
        this.failureLogged = false;
        return true;
      }
    } catch (err) {
      // No pubsub.subscriptions.get — do not block the stream, it may still
      // consume; a real problem surfaces on the stream itself.
      const code = (err as { code?: number }).code;
      if (code !== 7) throw err;
      this.logger.warn(
        `Streaming pull: cannot check whether "${this.shortName(subName)}" exists (PERMISSION_DENIED) — trying to open the stream`,
      );
      return true;
    }

    if (!this.autoCreate()) return false;

    const topicName =
      this.config.get<string>('GOOGLE_PUBSUB_TOPIC') ??
      `projects/${this.projectId(subName)}/topics/gmail-notifications`;

    try {
      const [created] = await this.pubsub!.topic(topicName).createSubscription(
        this.shortName(subName),
        { ackDeadlineSeconds: 60 },
      );
      this.logger.log(`Streaming pull: created subscription ${created.name}`);
      this.failureLogged = false;
      return true;
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 6) {
        // ALREADY_EXISTS — another instance/process created it in the meantime.
        return true;
      }
      throw err;
    }
  }

  private openStream(subName: string): void {
    if (this.destroyed || this.subscription) return;

    try {
      this.subscription = this.pubsub!.subscription(subName, {
        flowControl: { maxMessages: 10 },
      });

      this.subscription.on('message', (message) => {
        void this.handleMessage(message);
      });

      this.subscription.on('error', (err: Error) => {
        const code = (err as { code?: number }).code;
        this.logger.error(`Pub/Sub subscription error: ${err.message}`);
        // NOT_FOUND (5), PERMISSION_DENIED (7) and UNAUTHENTICATED (16) never
        // recover on their own — drop the stream and let the retry loop
        // reconnect once the subscription/key is fixed.
        if (code === 5 || code === 7 || code === 16) {
          void this.closeStream();
          this.scheduleReconnect();
        }
      });

      this.attempts = 0;
      this.failureLogged = false;
      this.logger.log(
        `Streaming pull started on ${this.shortName(subName)} (project ${this.projectId(subName)})`,
      );
    } catch (err) {
      this.reportFailure(err as Error, subName);
      this.scheduleReconnect();
    }
  }

  private async closeStream(): Promise<void> {
    const sub = this.subscription;
    this.subscription = undefined;
    if (!sub) return;
    try {
      await sub.close();
    } catch {
      // already closed / never opened — nothing to do
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectTimer) return;
    const delay = this.reconnectMs();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private reportFailure(err: Error, subName: string): void {
    const code = (err as { code?: number }).code;
    const name = this.shortName(subName);
    const project = this.projectId(subName);

    if (this.failureLogged) {
      const now = Date.now();
      if (
        now - this.lastWarningAt <
        GmailSubscriberService.WARNING_INTERVAL_MS
      ) {
        return;
      }
      this.lastWarningAt = now;
      this.logger.warn(
        `Streaming pull still not connected (attempt ${this.attempts}): ${err.message}`,
      );
      return;
    }
    this.failureLogged = true;
    this.lastWarningAt = Date.now();

    if (code === 5) {
      this.logger.error(
        `Streaming pull: subscription "${name}" does not exist in project "${project}". ` +
          `Create it (GCP Console → Pub/Sub → Subscriptions, Pull, ack deadline 60s) or set ` +
          `GOOGLE_PUBSUB_AUTO_CREATE_SUBSCRIPTION=true and grant the service account ` +
          `roles/pubsub.editor. It will connect automatically within ${Math.round(
            this.reconnectMs() / 1000,
          )}s after it exists — no restart needed.`,
      );
      return;
    }

    if (code === 7) {
      this.logger.error(
        `Streaming pull: PERMISSION_DENIED on "${name}" (project "${project}"). ` +
          `The service account needs pubsub.subscriptions.consume on the subscription ` +
          `(roles/pubsub.subscriber) and pubsub.subscriptions.create on the project ` +
          `(roles/pubsub.editor / roles/pubsub.admin) to auto-create it. Retrying in ` +
          `${Math.round(this.reconnectMs() / 1000)}s.`,
      );
      return;
    }

    if (code === 16) {
      this.logger.error(
        `Streaming pull: UNAUTHENTICATED on "${name}" (project "${project}"). ` +
          `The key in GOOGLE_APPLICATION_CREDENTIALS is invalid, revoked, or belongs ` +
          `to a deleted service account. Download a fresh JSON key for the service ` +
          `account that was granted roles/pubsub.subscriber, replace the file and ` +
          `restart. Retrying in ${Math.round(this.reconnectMs() / 1000)}s.`,
      );
      return;
    }

    this.logger.error(`Streaming pull failed: ${err.message}`);
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      const decoded = JSON.parse(message.data.toString('utf-8')) as {
        emailAddress?: string;
        historyId?: string | number;
      };
      const emailAddress = decoded.emailAddress;
      const historyId = Number(decoded.historyId);

      if (!emailAddress || !historyId) {
        this.logger.warn(
          'Invalid Pub/Sub payload (missing emailAddress/historyId) — acking',
        );
        message.ack();
        return;
      }

      const payload: GmailPushPayload = { emailAddress, historyId };

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
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    await this.closeStream();
    this.logger.log('Streaming pull stopped');
  }

  private isEnabled(): boolean {
    const raw = this.config.get<string>('GOOGLE_PUBSUB_PULL_ENABLED');
    return (raw ?? 'false').toLowerCase() === 'true';
  }

  private autoCreate(): boolean {
    const raw = this.config.get<string>(
      'GOOGLE_PUBSUB_AUTO_CREATE_SUBSCRIPTION',
    );
    return (raw ?? 'false').toLowerCase() === 'true';
  }

  private reconnectMs(): number {
    const n = Number(this.config.get<string>('GOOGLE_PUBSUB_RECONNECT_MS'));
    return Number.isFinite(n) && n >= 5000 ? n : 60_000;
  }

  /** Extract the project id from `projects/<id>/subscriptions/<name>`. */
  private parseProjectId(subName: string): string | undefined {
    const match = subName.match(/projects\/([^/]+)/);
    return match?.[1];
  }

  /** The project id, falling back to the configured subscription path. */
  private projectId(subName: string): string {
    return (
      this.config.get<string>('GOOGLE_CLOUD_PROJECT') ??
      this.parseProjectId(subName) ??
      ''
    );
  }

  /** `projects/p/subscriptions/x` → `x` (the Google client wants a short name). */
  private shortName(subName: string): string {
    const match = /subscriptions\/([^/]+)$/.exec(subName);
    return match ? match[1] : subName;
  }
}
