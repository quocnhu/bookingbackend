import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RawDataRepository } from '@/raw-data/raw-data.repository';
import { RawDataService } from '@/raw-data/raw-data.service';
import { BookingService } from '@/booking/booking.service';
import { BookingForwardService } from '@/booking/booking-forward.service';
import { ParserRegistry } from './parsers/parser-registry';
import { PARSE_QUEUE, ParseJobData } from './parsing.queue';
import { validateBookingFields } from './validation/booking-fields.schema';
import { emailFromHeader } from './email.util';

/** Outcomes that should trigger a sync notice to the mailbox. */
const FORWARD_OUTCOMES = new Set([
  'CREATED',
  'UPDATED',
  'CANCELLED',
  'SKIPPED',
  'UNCHANGED',
]);

/**
 * BullMQ worker for Stage 2 (per .md steps 11-18):
 * load rawData → pick parser by templateTag → extract → validate → upsert booking.
 * No parser match → unparsed; validation failure → parse_failed; OK → parsed + link booking.
 */
@Injectable()
@Processor(PARSE_QUEUE, { concurrency: 10 })
export class ParsingProcessor extends WorkerHost {
  private readonly logger = new Logger(ParsingProcessor.name);

  constructor(
    private readonly rawDataRepo: RawDataRepository,
    private readonly rawDataService: RawDataService,
    private readonly registry: ParserRegistry,
    private readonly bookingService: BookingService,
    private readonly bookingForward: BookingForwardService,
  ) {
    super();
  }

  async process(job: Job<ParseJobData>) {
    const { rawDataId } = job.data;
    const raw = await this.rawDataRepo.findById(rawDataId);
    if (!raw) return { skipped: true, reason: 'RAW_DATA_NOT_FOUND' };
    if (raw.status === 'parsed')
      return { skipped: true, reason: 'ALREADY_PARSED' };

    const payload = (raw.payload ?? {}) as Record<string, unknown>;
    const parser = this.registry.resolve(payload, raw.templateTag);

    if (!parser) {
      await this.rawDataService.markUnparsed(rawDataId);
      return { status: 'unparsed', rawDataId };
    }

    const fields = parser.extract(payload);
    if (!fields) {
      await this.rawDataService.markParseFailed(
        rawDataId,
        `${parser.templateTag}:PARSER_NO_MATCH`,
      );
      return {
        status: 'parse_failed',
        reason: `${parser.templateTag}:PARSER_NO_MATCH`,
      };
    }

    if (!fields.mail?.trim()) {
      const senderMail = emailFromHeader(payload.from);
      if (senderMail) {
        fields.mail = senderMail;
        fields.extra = { ...(fields.extra ?? {}), mailSource: 'sender-fallback' };
      }
    }

    const validation = validateBookingFields(fields);
    if (!validation.valid) {
      await this.rawDataService.markParseFailed(
        rawDataId,
        validation.errors.join('; '),
      );
      return { status: 'parse_failed', reason: validation.errors.join('; ') };
    }

    // The parser may enrich payload.booking — save it back so rawData keeps the full data.
    if (payload.booking !== undefined) {
      await this.rawDataService.updatePayload(rawDataId, payload);
    }

    const { booking, outcome } = await this.bookingService.upsert(
      validation.data!,
      rawDataId,
      undefined,
      undefined,
      this.resolveEmailDate(payload),
    );

    const isDuplicate = outcome === 'UNCHANGED' || outcome === 'SKIPPED';

    // Only the FIRST duplicate mail is kept (as the DUPLICATE audit row) and
    // notified. Every later copy is blocked completely: no rawData row and no
    // notification.
    if (isDuplicate) {
      const earlierDuplicates =
        await this.rawDataRepo.countDuplicateRowsForBooking(booking.id);
      if (earlierDuplicates > 0) {
        await this.rawDataRepo.delete(rawDataId);
        this.logger.log(
          `Blocked duplicate mail ${rawDataId} for booking ${booking.bookingRef} — an earlier duplicate was already recorded`,
        );
        return { status: 'duplicate_blocked', bookingId: booking.id };
      }
    }

    // Record WHAT the email was (new booking / amendment / cancellation) and
    // what the system did with it — the raw-mail list is filtered on these.
    // Make duplicates/blocked mails explicit so they're not confused with new bookings.
    const displayAction = isDuplicate ? 'DUPLICATE' : validation.data!.action;
    await this.rawDataService.markParsed(
      rawDataId,
      booking.id,
      displayAction,
      outcome,
    );
    this.logger.log(
      `Parsed rawData ${rawDataId} (${parser.templateTag}) -> booking ${booking.bookingRef} [${validation.data!.action}/${outcome}]`,
    );

    // Confirmation mail: "this mail with booking ref X was pushed to the Booking
    // table successfully" — so the operator never has to double-check manually.
    // Never blocks the job: forward() reports failures instead of throwing.
    if (FORWARD_OUTCOMES.has(outcome)) {
      await this.bookingForward.forward({
        bookingRef: booking.bookingRef,
        source: validation.data!.source,
        action: validation.data!.action,
        outcome,
        mailbox: this.str(payload.emailAddress) ?? '',
        messageId: this.str(payload.messageId),
        threadId: this.str(payload.threadId),
        rfcMessageId: this.str(payload.rfcMessageId),
        subject: this.str(payload.subject),
        from: this.str(payload.from),
        date: this.str(payload.date),
        body: this.str(payload.body),
      });
    }

    return { status: 'parsed', bookingId: booking.id };
  }

  private str(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  /**
   * When was the source email sent? Gmail `internalDate` (ms epoch) first,
   * then the raw `Date` header. Undefined = unknown (guard does not apply).
   */
  private resolveEmailDate(payload: Record<string, unknown>): Date | undefined {
    const ms = Number(payload.internalDate);
    if (Number.isFinite(ms) && ms > 0) return new Date(ms);
    const raw = typeof payload.date === 'string' ? payload.date : undefined;
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return undefined;
  }
}
