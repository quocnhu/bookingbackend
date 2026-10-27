import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '@/prisma/prisma.service';
import { GmailAuthService } from '@/ingestion/gmail-auth.provider';
import { REDIS_CLIENT } from '@/common/redis/redis.constants';
import {
  BOOKING_SYNC_HEADER,
  BOOKING_SYNC_HEADER_VALUE,
  BOOKING_SYNC_SUBJECT_PREFIX,
  DUPLICATE_NOTICE_TTL_SECONDS,
  duplicateNoticeKey,
} from './booking-forward.constants';

export interface BookingForwardInput {
  bookingRef: string;
  source?: string | null;
  action?: string | null;
  outcome?: string | null;
  /** The tracked mailbox that received (and is now sending) the mail. */
  mailbox: string;
  messageId?: string | null;
  /** Gmail threadId of the original mail — the notice joins that conversation. */
  threadId?: string | null;
  /** RFC 5322 Message-ID of the original mail (to reply in its thread). */
  rfcMessageId?: string | null;
  subject?: string | null;
  from?: string | null;
  date?: string | null;
  body?: string | null;
}

/**
 * "Pushed to Booking table" confirmation mail.
 *
 * After ParsingProcessor writes a booking it calls forward(): the original
 * booking mail is forwarded to BOOKING_FORWARD_TO with a short preface stating
 * that the mail with that booking ref was pushed to the Booking table, so the
 * operator never has to re-check the mail manually.
 *
 * Sending uses the tracked mailbox (GmailServer-side OAuth). That requires the
 * refresh token to carry https://www.googleapis.com/auth/gmail.send — reconnect
 * the mailbox once after this feature is deployed.
 *
 * When the recipient IS the tracked mailbox the notice comes back through the
 * watch/poll transport; BOOKING_SYNC_SUBJECT_PREFIX makes ingestion ignore it.
 */
@Injectable()
export class BookingForwardService {
  private readonly logger = new Logger(BookingForwardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auth: GmailAuthService,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
  ) {}

  /**
   * Forward the source mail with a sync confirmation. Never throws: a failed
   * confirmation must not fail the parse job (the booking is already written).
   */
  async forward(
    input: BookingForwardInput,
  ): Promise<{ sent: boolean; reason?: string }> {
    let duplicateClaimKey: string | undefined;
    try {
      if (!this.isEnabled()) return { sent: false, reason: 'DISABLED' };

      const recipients = this.recipients();
      if (recipients.length === 0) {
        return { sent: false, reason: 'NO_RECIPIENT' };
      }

      // Never forward a notice we sent ourselves (defence in depth; ingestion
      // ignores these by subject too).
      if (
        (input.subject ?? '')
          .trimStart()
          .startsWith(BOOKING_SYNC_SUBJECT_PREFIX)
      ) {
        return { sent: false, reason: 'SYSTEM_NOTICE' };
      }

      const account = await this.prisma.gmailAccount.findUnique({
        where: { email: input.mailbox },
        select: { refreshToken: true },
      });
      if (!account) {
        this.logger.warn(
          `Cannot forward ${input.bookingRef}: mailbox ${input.mailbox} is not tracked`,
        );
        return { sent: false, reason: 'MAILBOX_NOT_TRACKED' };
      }

      // A duplicate booking mail should notify the operator at most once.
      const isDuplicateOutcome =
        input.outcome === 'SKIPPED' || input.outcome === 'UNCHANGED';
      if (isDuplicateOutcome) {
        // History check: the current rawData row is already linked before we
        // get here, so >1 means an earlier duplicate already triggered (or
        // would have triggered) a notice. This also covers duplicates that
        // arrived before the Redis claim existed.
        try {
          const duplicateRows = await this.prisma.rawData.count({
            where: {
              linkedBooking: { bookingRef: input.bookingRef },
              outcome: { in: ['SKIPPED', 'UNCHANGED'] },
            },
          });
          if (duplicateRows > 1) {
            this.logger.log(
              `Suppressed duplicate notice for ${input.bookingRef} — an earlier duplicate was already handled`,
            );
            return { sent: false, reason: 'DUPLICATE_NOTICE_SUPPRESSED' };
          }
        } catch (err) {
          this.logger.warn(
            `Duplicate-notice history check failed for ${input.bookingRef}: ${(err as Error).message}`,
          );
        }

        // Atomic claim so two concurrent duplicate jobs cannot both send.
        duplicateClaimKey = duplicateNoticeKey(input.mailbox, input.bookingRef);
        try {
          const claimed = await this.redis?.set(
            duplicateClaimKey,
            '1',
            'EX',
            DUPLICATE_NOTICE_TTL_SECONDS,
            'NX',
          );
          if (claimed === null) {
            this.logger.log(
              `Suppressed duplicate notice for ${input.bookingRef} — one was already sent`,
            );
            return { sent: false, reason: 'DUPLICATE_NOTICE_SUPPRESSED' };
          }
        } catch (err) {
          // Redis is best-effort: never drop the notice because the cache is down.
          this.logger.warn(
            `Duplicate-notice claim failed for ${input.bookingRef}: ${(err as Error).message}`,
          );
        }
      }

      const raw = this.buildRawMessage(input, recipients);
      const gmail = this.auth.getGmailClient(account.refreshToken);
      // threadId is authoritative: without it Gmail may show the notice as a
      // separate conversation even when In-Reply-To/References are set.
      const threadId = (input.threadId ?? '').trim() || undefined;
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw, ...(threadId ? { threadId } : {}) },
      });

      this.logger.log(
        `Forwarded ${input.bookingRef} (${input.outcome}) to ${recipients.join(', ')} — gmail id ${result.data.id}`,
      );
      return { sent: true };
    } catch (err) {
      // The notice was not delivered — release the claim so a later duplicate
      // can try again instead of being suppressed forever.
      if (duplicateClaimKey && this.redis) {
        try {
          await this.redis.del(duplicateClaimKey);
        } catch {
          /* best-effort */
        }
      }
      const e = err as { code?: number; message?: string };
      const hint =
        e.code === 403 || /insufficient|scope/i.test(e.message ?? '')
          ? ' (reconnect the mailbox to grant the gmail.send scope)'
          : '';
      this.logger.error(
        `Failed to forward ${input.bookingRef}: ${e.message ?? err}${hint}`,
      );
      return { sent: false, reason: 'SEND_FAILED' };
    }
  }

  // ── MIME ────────────────────────────────────────────────────────────────

  private buildRawMessage(
    input: BookingForwardInput,
    recipients: string[],
  ): string {
    const alt = `booking-sync-alt-${randomUUID()}`;
    const subject = this.encodeHeader(this.subjectFor(input));
    const text = this.textBody(input);
    const html = this.htmlBody(input);
    const inReplyTo = this.threadMessageId(input.rfcMessageId);

    // A real reply: Gmail keeps In-Reply-To/References in the original
    // conversation, so the confirmation sits right under the booking mail.
    // The X-Booking-Sync header is then the loop guard (the subject is the
    // original one).
    const threadHeaders = inReplyTo
      ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`]
      : [];

    const mime = [
      'MIME-Version: 1.0',
      `To: ${recipients.join(', ')}`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${randomUUID()}@booking.local>`,
      ...threadHeaders,
      `${BOOKING_SYNC_HEADER}: ${BOOKING_SYNC_HEADER_VALUE}`,
      `Content-Type: multipart/alternative; boundary="${alt}"`,
      '',
      `--${alt}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      this.base64Lines(text),
      `--${alt}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      this.base64Lines(html),
      `--${alt}--`,
      '',
    ].join('\r\n');

    return Buffer.from(mime, 'utf-8').toString('base64url');
  }

  private subjectFor(input: BookingForwardInput): string {
    const original = (input.subject ?? '').trim();
    if (original) {
      // Reply in the original thread: keep its subject ("Re: …") so Gmail does
      // not start a new conversation.
      const bare = original.replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, '');
      return `Re: ${bare}`;
    }
    if (input.outcome === 'SKIPPED') {
      return `${BOOKING_SYNC_SUBJECT_PREFIX} ${input.bookingRef} - duplication mail blocked (already processed/exists)`;
    }
    const label =
      input.outcome === 'CREATED'
        ? 'new booking'
        : input.outcome === 'CANCELLED'
          ? 'cancellation'
          : input.outcome === 'UNCHANGED'
            ? 'duplication/unchanged - blocked'
            : 'amendment';
    return `${BOOKING_SYNC_SUBJECT_PREFIX} ${input.bookingRef} - ${label} pushed to Booking table`;
  }

  /** Keep only a well-formed `<...>` Message-ID; anything else is ignored. */
  private threadMessageId(value?: string | null): string | undefined {
    const id = (value ?? '').trim();
    return /^<[^<>\s]+>$/.test(id) ? id : undefined;
  }

  private textBody(input: BookingForwardInput): string {
    const meta = [
      `Booking ref: ${input.bookingRef}`,
      `Source: ${input.source ?? '-'}`,
      `Action: ${input.action ?? '-'} -> ${input.outcome ?? '-'}`,
      `Mailbox: ${input.mailbox}`,
      `Processed: ${new Date().toISOString()}`,
    ].join('\n');

    const original = [
      '----- Original message -----',
      `From: ${input.from ?? '-'}`,
      `Date: ${input.date ?? '-'}`,
      `Subject: ${input.subject ?? '-'}`,
      '',
      input.body?.trim() ? input.body.trim() : '(no text body)',
    ].join('\n');

    const header =
      input.outcome === 'SKIPPED' || input.outcome === 'UNCHANGED'
        ? `This mail with booking ref "${input.bookingRef}" was blocked as a duplication and not re-processed.`
        : `This mail with booking ref "${input.bookingRef}" was pushed to the Booking table successfully.`;

    return [header, '', meta, '', original, ''].join('\n');
  }

  private htmlBody(input: BookingForwardInput): string {
    const row = (label: string, value: string) =>
      `<tr><td style="padding:2px 12px 2px 0;color:#8c8c8c">${this.escapeHtml(label)}</td><td>${this.escapeHtml(value)}</td></tr>`;

    const header =
      input.outcome === 'SKIPPED' || input.outcome === 'UNCHANGED'
        ? `This mail with booking ref &quot;${this.escapeHtml(input.bookingRef)}&quot; was blocked as a duplication and not re-processed.`
        : `This mail with booking ref &quot;${this.escapeHtml(input.bookingRef)}&quot; was pushed to the Booking table successfully.`;

    return [
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f1f1f">',
      `<p style="margin:0 0 12px;font-size:15px"><strong>${header}</strong></p>`,
      '<table style="border-collapse:collapse;font-size:13px">',
      row('Source', input.source ?? '-'),
      row('Action', `${input.action ?? '-'} -&gt; ${input.outcome ?? '-'}`),
      row('Mailbox', input.mailbox),
      row('Processed', new Date().toISOString()),
      '</table>',
      '<hr style="border:none;border-top:1px solid #e8e8e8;margin:16px 0" />',
      '<p style="margin:0 0 6px;color:#8c8c8c;font-size:12px"><strong>Original message</strong></p>',
      `<p style="margin:0 0 10px;font-size:12px;color:#595959">From: ${this.escapeHtml(input.from ?? '-')}<br/>Date: ${this.escapeHtml(input.date ?? '-')}<br/>Subject: ${this.escapeHtml(input.subject ?? '-')}</p>`,
      `<pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:13px;margin:0">${this.escapeHtml(input.body?.trim() ? input.body.trim() : '(no text body)')}</pre>`,
      '</div>',
    ].join('');
  }

  /** RFC 2047 encode only when needed; strip CR/LF to block header injection. */
  private encodeHeader(value: string): string {
    const clean = value.replace(/[\r\n]+/g, ' ').trim();
    if (/^[\x20-\x7E]*$/.test(clean)) return clean;
    return `=?UTF-8?B?${Buffer.from(clean, 'utf-8').toString('base64')}?=`;
  }

  private base64Lines(value: string): string {
    return Buffer.from(value, 'utf-8')
      .toString('base64')
      .replace(/(.{76})/g, '$1\r\n');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Config ──────────────────────────────────────────────────────────────

  private isEnabled(): boolean {
    const raw = this.config.get<string>('BOOKING_FORWARD_ENABLED');
    return (raw ?? 'false').toLowerCase() === 'true';
  }

  private recipients(): string[] {
    const raw = this.config.get<string>('BOOKING_FORWARD_TO') ?? '';
    return raw
      .split(/[,\s;]+/)
      .map((s) => s.trim())
      .filter((s) => /^[^@\s]+@[^@\s]+$/.test(s));
  }
}
