import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '@/prisma/prisma.service';
import { RawDataService } from '@/raw-data/raw-data.service';
import { ParsingQueue } from '@/parsing/parsing.queue';
import {
  DEDUP_TTL_SECONDS,
  REDIS_CLIENT,
  dedupKey,
  historyCheckpointKey,
} from '@/common/redis/redis.constants';
import { GmailAuthService } from './gmail-auth.provider';
import type { GmailPushPayload } from './dto/gmail-push-payload.dto';

interface ParsedMail {
  messageId: string;
  threadId?: string;
  emailAddress: string;
  subject: string;
  from: string;
  date?: string;
  snippet?: string;
  body?: string;
  html?: string;
  internalDate?: string;
}

/** Subset of the Gmail API MessagePart — enough to extract the body. */
interface MessagePart {
  mimeType?: string | null;
  body?: { data?: string | null };
  parts?: MessagePart[];
}

/**
 * Stage 1 — Ingestion (per .md steps 3-10):
 * push Pub/Sub → history.list(startHistoryId) → resolve changed messageIds
 * → Redis dedup claim (SET NX EX) → messages.get → tag sender/template
 * → insert rawData (status=pending) → enqueue parse job → advance checkpoint.
 */
@Injectable()
export class GmailPubSubService {
  private readonly logger = new Logger(GmailPubSubService.name);
  private allowedSendersCache: Set<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: GmailAuthService,
    private readonly rawDataService: RawDataService,
    private readonly parsingQueue: ParsingQueue,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async handlePush(payload: GmailPushPayload) {
    const { emailAddress, historyId } = payload;
    const account = await this.prisma.gmailAccount.findUnique({
      where: { email: emailAddress },
    });
    if (!account) {
      this.logger.warn(`Push from untracked mailbox ${emailAddress} — ignored`);
      return { handled: 0, duplicates: 0, ignored: true };
    }

    const startHistoryId =
      (await this.redis.get(historyCheckpointKey(emailAddress))) ??
      account.lastHistoryId;
    this.logger.log(
      `History sync ${emailAddress}: startHistoryId=${startHistoryId} pushHistoryId=${historyId}`,
    );

    const gmail = this.auth.getGmailClient(account.refreshToken);
    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
    });

    const messageIds = (history.data.history ?? [])
      .flatMap((h) => h.messages?.map((m) => m.id).filter(Boolean) ?? [])
      .filter((id): id is string => Boolean(id))
      .filter((id, index, arr) => arr.indexOf(id) === index);

    let handled = 0;
    let duplicates = 0;
    let ignored = 0;

    for (const messageId of messageIds) {
      // Dedup claim (step 5): atomic, safe under concurrency.
      const claimed = await this.redis.set(
        dedupKey(messageId),
        '1',
        'EX',
        DEDUP_TTL_SECONDS,
        'NX',
      );
      if (!claimed) {
        duplicates++;
        continue;
      }

      try {
        const mail = await this.fetchMessage(gmail, messageId, emailAddress);

        // Only ingest mail from senders in MAIL_ALLOWED_SENDERS — everything else is IGNORED.
        if (!this.isAllowedSender(mail.from)) {
          ignored++;
          this.logger.log(
            `Ignored mail "${mail.subject}" from "${mail.from}" — sender not in MAIL_ALLOWED_SENDERS`,
          );
          continue;
        }

        // >>> PARSED MAIL — console.log for debugging/extending the parser <<<
        console.log('[ingestion] parsed mail:', {
          messageId: mail.messageId,
          emailAddress: mail.emailAddress,
          from: mail.from,
          subject: mail.subject,
          date: mail.date ?? mail.internalDate,
          snippet: mail.snippet?.slice(0, 300),
          bodyPreview: mail.body?.slice(0, 500),
        });

        const templateTag = this.tagTemplate(mail);

        // >>> TEMPLATE TAG — console.log to see which parser will run <<<
        console.log('[ingestion] template tag:', {
          emailAddress,
          messageId,
          templateTag,
        });

        const rawData = await this.rawDataService.createIngested({
          sourceId: `gmail-${messageId}`,
          email: emailAddress,
          templateTag,
          payload: {
            ...mail,
            emailAddress,
            historyId,
          },
        });

        await this.parsingQueue.enqueue(rawData.id);
        handled++;
      } catch (err) {
        this.logger.error(
          `Failed to ingest ${messageId}: ${(err as Error).message}`,
        );
      }
    }

    // Advance checkpoint (step 10) — only after a safe enqueue.
    const nextHistoryId = history.data.historyId;
    if (nextHistoryId) {
      await this.redis.set(
        historyCheckpointKey(emailAddress),
        String(nextHistoryId),
      );
      await this.prisma.gmailAccount.update({
        where: { id: account.id },
        data: { lastHistoryId: String(nextHistoryId) },
      });
    }

    return { handled, duplicates, ignored, nextHistoryId: nextHistoryId ?? null };
  }

  /** Test the connection using the stored refresh token (used by the frontend "Test" button). */
  async testConnection(accountId: string) {
    const account = await this.prisma.gmailAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new Error('Tracked mailbox not found');
    const gmail = this.auth.getGmailClient(account.refreshToken);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return {
      ok: true,
      email: profile.data.emailAddress ?? account.email,
      historyId: profile.data.historyId,
    };
  }

  private async fetchMessage(
    gmail: ReturnType<GmailAuthService['getGmailClient']>,
    messageId: string,
    emailAddress: string,
  ): Promise<ParsedMail> {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    const headers = msg.data.payload?.headers ?? [];
    const header = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value ?? '';

    return {
      messageId,
      threadId: msg.data.threadId ?? undefined,
      emailAddress,
      subject: header('subject'),
      from: header('from'),
      date: header('date') || undefined,
      snippet: msg.data.snippet ?? undefined,
      body: this.extractTextBody(msg.data.payload),
      html: this.extractHtmlBody(msg.data.payload) || undefined,
      internalDate: msg.data.internalDate ?? undefined,
    };
  }

  /** Extract text/plain from the payload (handles nested parts). */
  private extractTextBody(payload: MessagePart | undefined): string {
    if (!payload) return '';
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    }
    let text = '';
    for (const part of payload.parts ?? []) {
      text += this.extractTextBody(part) + '\n';
    }
    return text.trim();
  }

  /** Extract text/html from the payload (html is preferred so the table parser can read it). */
  private extractHtmlBody(payload: MessagePart | undefined): string {
    if (!payload) return '';
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    }
    let html = '';
    for (const part of payload.parts ?? []) {
      html += this.extractHtmlBody(part) + '\n';
    }
    return html.trim();
  }

  /** Read MAIL_ALLOWED_SENDERS from env (domain/email, comma-separated). */
  private get allowedSenders(): Set<string> {
    if (!this.allowedSendersCache) {
      const raw =
        this.config.get<string>('MAIL_ALLOWED_SENDERS') ??
        'tripadvisor.com,getyourguide.com,viator.com';
      this.allowedSendersCache = new Set(
        raw
          .split(/[,\s;]+/)
          .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
          .filter(Boolean),
      );
    }
    return this.allowedSendersCache;
  }

  /** Mail is only ingested if the From matches a domain/email in MAIL_ALLOWED_SENDERS. */
  private isAllowedSender(fromRaw: string): boolean {
    const tokens = this.allowedSenders;
    if (tokens.size === 0) return true;
    const emailMatch = fromRaw.match(/<([^<>@]+\@[^<>]+)>/i);
    const email = (emailMatch ? emailMatch[1] : fromRaw).toLowerCase().trim();
    for (const token of tokens) {
      if (
        email === token ||
        email.endsWith('@' + token) ||
        email.endsWith('.' + token)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Assign templateTag from the From/Subject headers (step 7) — cheap matching only, no extraction.
   * console.log is called here to make it easy to see which template was selected.
   */
  private tagTemplate(mail: ParsedMail): string {
    const from = mail.from.toLowerCase();
    const subject = mail.subject.toLowerCase();
    let tag = 'unknown';

    if (from.includes('airbnb.com')) tag = 'airbnb';
    else if (from.includes('booking.com') || from.includes('@booking.com'))
      tag = 'booking-com';
    else if (from.includes('getyourguide.com') || subject.includes('getyourguide'))
      tag = 'getyourguide';
    else if (from.includes('viator.com') || subject.includes('viator'))
      tag = 'viator';
    else if (from.includes('tripadvisor.com')) tag = 'tripadvisor';
    else if (subject.includes('tripadvisor')) tag = 'tripadvisor';
    else if (/booking|reservation|confirmation|trip to/i.test(subject))
      tag = 'website';

    return tag;
  }
}
