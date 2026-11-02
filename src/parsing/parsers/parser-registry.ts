import { Injectable } from '@nestjs/common';
import type { TemplateParser } from './parser.interface';
import { AirbnbParser } from './airbnb.parser';
import { BookingComParser } from './booking-com.parser';
import { GetYourGuideParser } from './getyourguide.parser';
import { AirportTransferParser } from './airport-transfer.parser';
import { AdvancedViatorParser } from './advanced-viator.parser';
import { ViatorParser } from './viator.parser';
import { WebsiteParser } from './website.parser';

/**
 * Maps templateTag (assigned at ingestion from the header match) → parser instance.
 * No matching parser → rawData.status = unparsed (manual review queue).
 */
@Injectable()
export class ParserRegistry {
  private readonly parsers = new Map<string, TemplateParser>();

  constructor(
    airbnb: AirbnbParser,
    bookingCom: BookingComParser,
    getYourGuide: GetYourGuideParser,
    airportTransfer: AirportTransferParser,
    advancedViator: AdvancedViatorParser,
    viator: ViatorParser,
    website: WebsiteParser,
  ) {
    for (const parser of [
      airbnb,
      bookingCom,
      getYourGuide,
      // Airport transfers are a specialised form of the message-centre
      // conversation template (always private) — try it before advancedViator.
      airportTransfer,
      // Before viator: the conversation mails also match the regular Viator
      // template ("Booking Ref."), but they are a different template.
      advancedViator,
      viator,
      website,
    ]) {
      this.parsers.set(parser.templateTag, parser);
    }
  }

  get(tag?: string | null): TemplateParser | undefined {
    if (!tag) return undefined;
    // Legacy alias: rows ingested before the 'tripadvisor' → 'viator' rename
    // still carry templateTag 'tripadvisor' and must resolve to the same parser.
    if (tag === 'tripadvisor') tag = 'viator';
    return this.parsers.get(tag);
  }

  /**
   * Return the first parser that matches the payload (fallback when tag = unknown).
   * The parser for an already matched tag must also pass canParse(payload) — if the
   * template is still unknown (e.g. Viator has no HTML parser yet) it falls to
   * `unparsed` for manual review instead of being flagged as parse_failed.
   */
  resolve(
    payload: Record<string, unknown>,
    tag?: string | null,
  ): TemplateParser | undefined {
    const direct = this.get(tag);
    if (direct && direct.canParse(payload)) {
      // A body-specific template may refine a generic header tag: an airport
      // transfer conversation mail is tagged advancedViator by its sender, but
      // it must be parsed by the private airportTransfer template.
      const airport = this.parsers.get('airportTransfer');
      if (airport && airport !== direct && airport.canParse(payload)) {
        return airport;
      }
      return direct;
    }
    for (const parser of this.parsers.values()) {
      if (parser.canParse(payload)) return parser;
    }
    return undefined;
  }

  tags(): string[] {
    return [...this.parsers.keys()];
  }
}
