import { Injectable } from '@nestjs/common';
import type { TemplateParser } from './parser.interface';
import { AirbnbParser } from './airbnb.parser';
import { BookingComParser } from './booking-com.parser';
import { GetYourGuideParser } from './getyourguide.parser';
import { TripAdvisorParser } from './tripadvisor.parser';
import { WebsiteParser } from './website.parser';

/**
 * Ánh xạ templateTag (gán lúc ingestion từ header match) → instance parser.
 * Không có parser khớp → rawData.status = unparsed (manual review queue).
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
   * Trả parser đầu tiên khớp payload (fallback khi tag = unknown).
   * Parser của tag đã match cũng phải vượt qua canParse(payload) — nếu chưa
   * biết template (vd TripAdvisor chưa build parser HTML) thì rơi vào `unparsed`
   * để review thủ công, không bị đánh parse_failed.
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
