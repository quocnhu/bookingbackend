import { Injectable } from '@nestjs/common';
import type { TemplateParser } from './parser.interface';
import { AirbnbParser } from './airbnb.parser';
import { BookingComParser } from './booking-com.parser';
import { GetYourGuideParser } from './getyourguide.parser';
import { TripAdvisorParser } from './tripadvisor.parser';
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
    tripAdvisor: TripAdvisorParser,
    website: WebsiteParser,
  ) {
    for (const parser of [
      airbnb,
      bookingCom,
      getYourGuide,
      tripAdvisor,
      website,
    ]) {
      this.parsers.set(parser.templateTag, parser);
    }
  }

  get(tag?: string | null): TemplateParser | undefined {
    if (!tag) return undefined;
    return this.parsers.get(tag);
  }

  /**
   * Return the first parser that matches the payload (fallback when tag = unknown).
   * The parser for an already matched tag must also pass canParse(payload) — if the
   * template is still unknown (e.g. TripAdvisor has no HTML parser yet) it falls to
   * `unparsed` for manual review instead of being flagged as parse_failed.
   */
  resolve(
    payload: Record<string, unknown>,
    tag?: string | null,
  ): TemplateParser | undefined {
    const direct = this.get(tag);
    if (direct && direct.canParse(payload)) return direct;
    for (const parser of this.parsers.values()) {
      if (parser.canParse(payload)) return parser;
    }
    return undefined;
  }

  tags(): string[] {
    return [...this.parsers.keys()];
  }
}
