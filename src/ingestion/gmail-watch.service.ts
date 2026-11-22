import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { GmailAuthService } from './gmail-auth.provider';

const RENEW_WINDOW_MS = 24 * 60 * 60 * 1000; // renew when 1 day or less remains
const WATCH_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Register + renew the Gmail watch() on the Pub/Sub topic (per .md step 2).
 * A watch expires on its own after ~7 days, so it must be renewed periodically via cron.
 */
@Injectable()
export class GmailWatchService {
  private readonly logger = new Logger(GmailWatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: GmailAuthService,
  ) {}

  async registerWatch(refreshToken: string): Promise<Date | null> {
    const topic = process.env.GOOGLE_PUBSUB_TOPIC;
    if (!topic) {
      this.logger.warn('GOOGLE_PUBSUB_TOPIC not set — skipping watch()');
      return null;
    }
    const gmail = this.auth.getGmailClient(refreshToken);
    const watch = await gmail.users.watch({
      userId: 'me',
      requestBody: { topicName: topic, labelIds: ['INBOX'] },
    });
    return watch.data.expiration
      ? new Date(Number(watch.data.expiration))
      : null;
  }

  async registerWatchForAccount(
    accountId: string,
  ): Promise<{ watchExpiration: Date | null }> {
    const account = await this.prisma.gmailAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) return { watchExpiration: null };
    const expiration = await this.registerWatch(account.refreshToken);
    if (expiration) {
      await this.prisma.gmailAccount.update({
        where: { id: accountId },
        data: { watchExpiration: expiration },
      });
    }
    return { watchExpiration: expiration };
  }

  // Hourly (not daily) so a watch is renewed as soon as it drops to 1 day left,
  // and a failed renewal is retried within the hour instead of after expiry.
  @Cron('15 * * * *', { timeZone: WATCH_TIMEZONE })
  async renewExpiringWatches() {
    const accounts = await this.prisma.gmailAccount.findMany();
    const soon = new Date(Date.now() + RENEW_WINDOW_MS);
    const expiring = accounts.filter(
      (a) => a.watchExpiration.getTime() <= soon.getTime(),
    );

    let renewed = 0;
    for (const account of expiring) {
      try {
        const expiration = await this.registerWatch(account.refreshToken);
        if (expiration) {
          await this.prisma.gmailAccount.update({
            where: { id: account.id },
            data: { watchExpiration: expiration },
          });
          renewed++;
        }
      } catch (err) {
        this.logger.warn(
          `Renew watch failed for ${account.email}: ${(err as Error).message}`,
        );
      }
    }

    if (renewed > 0 || expiring.length > 0) {
      this.logger.log(
        `Watch renewal: ${renewed}/${expiring.length} expiring accounts renewed`,
      );
    }
    return { checked: accounts.length, expiringSoon: expiring.length, renewed };
  }
}
