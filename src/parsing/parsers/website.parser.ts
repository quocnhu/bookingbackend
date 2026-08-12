import { Injectable } from '@nestjs/common';
import { BookingNormalizerService } from '../booking-normalizer.service';
import type { BookingFields, TemplateParser } from './parser.interface';

/**
 * Website — đơn đặt qua form website. Payload chứa sẵn JSON đã parse
 * (`payload.booking` / `payload.parsedBooking`), chỉ normalize sang BookingFields.
 */
@Injectable()
export class WebsiteParser implements TemplateParser {
  readonly templateTag = 'website';

  constructor(private readonly normalizer: BookingNormalizerService) {}

  canParse(payload: Record<string, unknown>): boolean {
    const hasBooking = Boolean(payload.booking ?? payload.parsedBooking);
    const rawSource = payload.source ?? payload.templateTag;
    const source = typeof rawSource === 'string' ? rawSource.toLowerCase() : '';
    return (
      hasBooking &&
      (source === 'website' || source === '' || source === 'unknown')
    );
  }

  extract(payload: Record<string, unknown>): BookingFields | null {
    const result = this.normalizer.normalize(payload, 'website');
    return result.clean ? result.data! : null;
  }
}
