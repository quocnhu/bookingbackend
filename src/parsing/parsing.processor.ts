import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RawDataRepository } from '@/raw-data/raw-data.repository';
import { RawDataService } from '@/raw-data/raw-data.service';
import { BookingService } from '@/booking/booking.service';
import { ParserRegistry } from './parsers/parser-registry';
import { PARSE_QUEUE, ParseJobData } from './parsing.queue';
import { validateBookingFields } from './validation/booking-fields.schema';

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

    const booking = await this.bookingService.upsert(
      validation.data!,
      rawDataId,
    );

    await this.rawDataService.markParsed(rawDataId, booking.id);
    this.logger.log(
      `Parsed rawData ${rawDataId} (${parser.templateTag}) -> booking ${booking.bookingRef}`,
    );
    return { status: 'parsed', bookingId: booking.id };
  }
}
