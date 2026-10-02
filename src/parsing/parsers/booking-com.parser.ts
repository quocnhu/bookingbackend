import { Injectable } from '@nestjs/common';
import type { BookingFields, TemplateParser } from './parser.interface';

const TEN_DIGIT_REF = /\b(\d{10})\b/;
const DATE_PAIR_RE =
  /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4})/gi;

/** Safely coerce any value to a string (avoids '[object Object]'). */
const asString = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/**
 * Booking.com confirmation email parser (heuristic over headers + plain text body).
 * A standard Booking.com ref is a 10-digit string.
 */
@Injectable()
export class BookingComParser implements TemplateParser {
  readonly templateTag = 'booking-com';

  canParse(payload: Record<string, unknown>): boolean {
    const from = asString(payload.from).toLowerCase();
    const subject = asString(payload.subject).toLowerCase();
    return (
      from.includes('booking.com') ||
      subject.includes('booking.com') ||
      subject.includes('booking confirmation') ||
      subject.includes('your booking')
    );
  }

  extract(payload: Record<string, unknown>): BookingFields | null {
    const body = `${asString(payload.subject)}\n${asString(payload.body)}\n${asString(payload.snippet)}`;

    const ref = this.matchRef(body);
    if (!ref) return null;

    const dates = this.matchDates(body);
    if (!dates.startingDate) return null;

    return {
      action: this.isCancellation(body) ? 'CANCEL' : 'CREATE',
      bookingRef: ref,
      source: 'booking-com',
      customerName: this.matchGuest(body),
      startingDate: dates.startingDate,
      totalPax: this.matchPax(body),
      hotelName: this.matchHotel(body),
      address: this.matchAddress(body),
      mail: asString(payload.emailAddress) || undefined,
    };
  }

  private matchRef(body: string): string | null {
    const m =
      /\b(?:reservation|booking|reference|pin|confirmation)\s*[#:]?\s*(\d{10})\b/i.exec(
        body,
      ) ?? TEN_DIGIT_REF.exec(body);
    return m ? m[1] : null;
  }

  private isCancellation(body: string): boolean {
    return /\b(cancel(?:led|lation)?|refund(?:ed)?)\b/i.test(body);
  }

  private matchGuest(body: string): string | undefined {
    const m =
      /\b(?:guest|lead guest name|traveller name|name)\s*[:-]\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/.exec(
        body,
      ) ?? /Hi\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?),/.exec(body);
    return m ? m[1].trim() : undefined;
  }

  private matchDates(body: string): { startingDate?: string } {
    const all: string[] = body.match(DATE_PAIR_RE) ?? [];
    const normalized: string[] = all.map((d) => {
      const date = new Date(d);
      return Number.isNaN(date.getTime()) ? d : date.toISOString();
    });
    const checkIn = /\bcheck[- ]?in\b[:\s]*([A-Z][a-z]+ \d{1,2},? \d{4})/i.exec(
      body,
    );
    return {
      startingDate: checkIn ? this.normalize(checkIn[1]) : normalized[0],
    };
  }

  private matchPax(body: string): number | undefined {
    const m = /(\d+)\s*(?:adult|guest|traveller|traveler)s?\b/i.exec(body);
    return m ? Number(m[1]) : undefined;
  }

  private matchHotel(body: string): string | undefined {
    const m =
      /\b(?:hotel|property|accommodation)\b[:\s]*\n?\s*([^\n]{3,80})/.exec(
        body,
      );
    return m ? m[1].trim() : undefined;
  }

  private matchAddress(body: string): string | undefined {
    const m = /\b(?:address|location)\b[:\s]*\n?\s*([^\n]{5,90})/.exec(body);
    return m ? m[1].trim() : undefined;
  }

  private normalize(raw: string): string {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toISOString();
  }
}
