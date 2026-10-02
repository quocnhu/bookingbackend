import { Injectable } from '@nestjs/common';
import { BookingProvider, TourType } from '@prisma/client';
import { load } from 'cheerio';
import type { BookingFields, TemplateParser } from './parser.interface';

/** Safely coerce any value to a string (avoids '[object Object]'). */
const asString = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/** Collapse whitespace (multiple lines/indentation in a cell → 1 line). */
const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * GetYourGuide — tour booking confirmation email from GetYourGuide (Viator marketplace).
 * The main template is an HTML label→value table (same as TripAdvisor, example in
 * src/check/gmail.consumer.ts with bookingRef "GET-91511242", soldBy GetYourGuide):
 *
 *   Booking Ref. / Product Booking Ref. / Ext. Booking Ref. → bookingRef
 *   Product     → tourName   Rate            → tourType
 *   Supplier    → supplier   Pax             → totalPax
 *   Customer    → customerName Customer Email → mail
 *   Date        → startingDate Pick-up       → hotelName + address
 *
 * Two other formats are also supported:
 *   - payload.booking/parsedBooking already parsed as JSON,
 *   - plain-text GYG: "Booking number:" / "Booking reference:" + participants + pickup.
 * The rich data is stored in payload.booking so it is kept in rawData.payload.
 */
@Injectable()
export class GetYourGuideParser implements TemplateParser {
  readonly templateTag = 'getyourguide';

  canParse(payload: Record<string, unknown>): boolean {
    const from = asString(payload.from).toLowerCase();
    const subject = asString(payload.subject).toLowerCase();
    const text = `${asString(payload.html)}\n${asString(payload.body)}`;
    const hasBooking = Boolean(payload.booking ?? payload.parsedBooking);

    return (
      from.includes('getyourguide.com') ||
      subject.includes('getyourguide') ||
      /\bsold by\s*[:#]?\s*getyourguide/i.test(text) ||
      /\bbooking channel\s*[:#]?\s*getyourguide/i.test(text) ||
      /\bGYG[-_ ]?\d{4,9}\b/i.test(text) ||
      (hasBooking &&
        (asString(payload.source).toLowerCase().includes('getyourguide') ||
          asString(payload.channel).toUpperCase() === 'GETYOURGUIDE'))
    );
  }

  extract(payload: Record<string, unknown>): BookingFields | null {
    const html = asString(payload.html);
    const body = asString(payload.body);
    const text = html || body;
    const subject = asString(payload.subject);

    // 1. HTML label→value table (standard Viator/GetYourGuide operator email).
    if (text.includes('<')) {
      const rich = this.parseTable(text);
      if (rich) {
        payload.booking = rich;
        return this.toFields(rich, subject);
      }
    }

    // 2. Payload already parsed as JSON.
    if (payload.booking ?? payload.parsedBooking) {
      const rich = this.fromJson(payload);
      if (rich) {
        payload.booking = rich;
        return this.toFields(rich, subject);
      }
    }

    // 3. Plain-text GetYourGuide confirmation.
    const rich = this.parsePlain(text, payload);
    if (rich) {
      payload.booking = rich;
      return this.toFields(rich, subject);
    }

    return null;
  }

  /** Read the HTML table: each `tr` → [label, value]. */
  private parseTable(raw: string): Record<string, unknown> | null {
    const rows = new Map<string, string>();
    const text = raw.replace(/<br\s*\/?>/gi, '\n');

    try {
      const $ = load(text);
      $('tr').each((_, tr) => {
        const cells = $(tr)
          .find('td, th')
          .map((_, td) => $(td).text().trim())
          .get();
        if (cells.length < 2) return;
        const label = cells[0].replace(/\s+/g, ' ').trim();
        this.setRow(
          rows,
          label,
          cells.slice(1).join(' ').replace(/\s+/g, ' ').trim(),
        );
      });
    } catch {
      // ignore, use the regex fallback
    }

    if (rows.size === 0) {
      // Fallback: "Label: value" on its own line.
      for (const line of text.split('\n')) {
        const m = /^([A-Za-z][A-Za-z .-]{2,40}?):\s*(.*)$/.exec(line.trim());
        if (m) this.setRow(rows, m[1], m[2]);
      }
    }

    const bookingRef =
      rows.get('bookingRef') ??
      rows.get('productBookingRef') ??
      rows.get('extBookingRef');
    if (!bookingRef) return null;

    const date = rows.get('date');
    return {
      provider: 'getyourguide',
      bookingRef,
      productBookingRef: rows.get('productBookingRef') || null,
      extBookingRef: rows.get('extBookingRef') || null,
      tourName: rows.get('product') || null,
      supplier: rows.get('supplier') || null,
      soldBy: rows.get('soldBy') || null,
      bookingChannel: rows.get('bookingChannel') || null,
      customer: rows.get('customer') || null,
      customerEmail: rows.get('customerEmail') || null,
      customerPhone: rows.get('customerPhone') || null,
      date: date || null,
      rate: rows.get('rate') || null,
      pax: rows.get('pax') || null,
      paxTotal: this.sumPax(rows.get('pax')),
      tourType: this.detectTourType(`${rows.get('rate') ?? ''} ${rows.get('product') ?? ''}`),
      pickUp: rows.get('pickUp') || null,
      pickUpAddress: this.subAddress(rows.get('pickUp')),
      guidedLanguages: rows.get('guidedLanguages') || null,
      extras: rows.get('extras') || null,
      notes: rows.get('notes') || null,
      createdAt: rows.get('created') || null,
    };
  }

  private setRow(rows: Map<string, string>, label: string, value: string) {
    const normalized = label
      .toLowerCase()
      .replace(/\./g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const keys: Array<[string, string]> = [
      ['booking ref', 'bookingRef'],
      ['product booking ref', 'productBookingRef'],
      ['ext booking ref', 'extBookingRef'],
      ['product', 'product'],
      ['supplier', 'supplier'],
      ['sold by', 'soldBy'],
      ['booking channel', 'bookingChannel'],
      ['customer email', 'customerEmail'],
      ['customer phone', 'customerPhone'],
      ['guided languages', 'guidedLanguages'],
      ['pick up', 'pickUp'],
      ['pickup', 'pickUp'],
      ['booking languages', 'bookingLanguages'],
      ['customer', 'customer'],
      ['date', 'date'],
      ['rate', 'rate'],
      ['pax', 'pax'],
      ['notes', 'notes'],
      ['extras', 'extras'],
      ['created', 'created'],
    ];
    for (const [needle, field] of keys) {
      if (normalized.startsWith(needle)) {
        const current = rows.get(field);
        rows.set(field, current ? `${current}\n${value}` : value);
        return;
      }
    }
  }

  /** From payload.booking/parsedBooking already parsed as JSON. */
  private fromJson(
    payload: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const b = (payload.booking ?? payload.parsedBooking ?? {}) as Record<
      string,
      unknown
    >;
    const bookingRef =
      asString(b.bookingRef) ||
      asString(b.productBookingRef) ||
      asString(b.extBookingRef);
    if (!bookingRef) return null;
    return {
      provider: asString(b.provider) || 'getyourguide',
      bookingRef,
      productBookingRef: b.productBookingRef ?? null,
      extBookingRef: b.extBookingRef ?? null,
      tourName: asString(b.tourName ?? b.product ?? b.tour) || null,
      supplier: b.supplier ?? null,
      soldBy: b.soldBy ?? null,
      bookingChannel: b.bookingChannel ?? null,
      customer: asString(b.customer ?? b.customerName) || null,
      customerEmail: asString(b.customerEmail ?? b.mail) || null,
      customerPhone: asString(b.customerPhone ?? b.phone) || null,
      date: asString(b.date ?? b.startingDate) || null,
      rate: b.rate ?? null,
      pax: asString(b.pax ?? b.paxTotal) || null,
      paxTotal: b.paxTotal ?? this.sumPax(asString(b.pax)),
      tourType: this.detectTourType(asString(b.rate ?? b.tourType)),
      pickUp: b.pickUp ?? null,
      pickUpAddress: b.pickUpAddress ?? null,
      guidedLanguages: b.guidedLanguages ?? null,
      extras: b.extras ?? null,
      notes: b.notes ?? null,
      createdAt: b.createdAt ?? null,
    };
  }

  /** Plain-text GYG confirmation: "Booking number:" + participants + pickup. */
  private parsePlain(
    text: string,
    payload: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const bookingRef =
      /(?:booking|reservation|confirmation)\s*(?:number|no\.?|ref(?:erence)?|id)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,19})/i.exec(
        text,
      )?.[1] ?? /\bGYG[-_ ]?(\d{4,9})\b/i.exec(text)?.[1] ?? null;
    if (!bookingRef) {
      const stable = asString(payload.threadId) || asString(payload.messageId);
      if (!stable) return null;
      const found = /(?:new booking|booked|confirmed)/i.test(text);
      if (!found) return null;
    }

    const date = this.matchDate(text);
    if (!date) return null;

    const guest =
      /(?:lead )?(?:guest|traveller|traveler|customer|passenger)\s*[:#-]\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i.exec(
        text,
      )?.[1] ?? null;
    const mail =
      /[\w.+-]+@[\w-]+\.[\w.]+/.exec(
        text.replace(
          /(?:sold by|booked by|getyourguide)\s*[:#-]?\s*[\w.+-]+@[\w-]+\.[\w.]+/gi,
          '',
        ),
      )?.[0] ?? null;
    const phone = this.matchPhone(text);
    const pickUp =
      /(?:pick[- ]?up|pickup (?:point|location|hotel))\s*[:#-]\s*([^\n,.]+(?:\.[^\n],?)?[^\n]*)/i.exec(
        text,
      )?.[1] ?? null;

    const tourName =
      (/(?:activity|product|tour)\s*[:#-]\s*(.{4,120})/i.exec(text)?.[1] ??
        asString(payload.subject)) ||
      null;

    return {
      provider: 'getyourguide',
      bookingRef: bookingRef ?? `GYG-EMAILLESS-${asString(payload.threadId) ?? asString(payload.messageId)}`,
      productBookingRef: null,
      extBookingRef: null,
      tourName,
      supplier: null,
      soldBy: 'GetYourGuide',
      bookingChannel: 'GetYourGuide',
      customer: guest,
      customerEmail: mail,
      customerPhone: phone,
      date: date ?? null,
      rate: null,
      pax: null,
      paxTotal: this.matchPax(text),
      tourType: this.detectTourType(asString(payload.subject)),
      pickUp: pickUp ? pickUp.split(',')[0].trim() : null,
      pickUpAddress:
        pickUp && pickUp.includes(',')
          ? pickUp.slice(pickUp.indexOf(',') + 1).trim() || null
          : null,
      guidedLanguages: null,
      extras: null,
      notes: null,
      createdAt: null,
    };
  }

  private toFields(
    rich: Record<string, unknown>,
    subject: string,
  ): BookingFields {
    const pickUp = this.splitPickUp(asString(rich.pickUp));
    return {
      action: /\b(cancel(?:led|lation)?|refund(?:ed)?)\b/i.test(subject)
        ? 'CANCEL'
        : 'CREATE',
      bookingRef: asString(rich.bookingRef),
      source: 'getyourguide',
      channel: BookingProvider.GETYOURGUIDE,
      customerName: asString(rich.customer) || undefined,
      mail: asString(rich.customerEmail) || undefined,
      phone: asString(rich.customerPhone) || undefined,
      tourName: asString(rich.tourName) || undefined,
      tourType:
        asString(rich.tourType) === 'UNKNOWN'
          ? undefined
          : (rich.tourType as TourType | undefined),
      startingDate: this.normalizeDate(asString(rich.date)),
      totalPax:
        rich.paxTotal != null
          ? Number(rich.paxTotal)
          : this.matchPax(asString(rich.pax)) ?? undefined,
      paxDetail: asString(rich.pax) || undefined,
      hotelName: pickUp.hotel || undefined,
      address: pickUp.address || asString(rich.pickUpAddress) || undefined,
    };
  }

  /** Split hotel / address at the first comma. */
  private splitPickUp(raw?: string): { hotel?: string; address?: string } {
    const value = raw?.trim();
    if (!value) return {};
    const comma = value.indexOf(',');
    if (comma === -1) return { hotel: value };
    const hotel = value.slice(0, comma).trim();
    const address = value.slice(comma + 1).trim();
    return hotel ? { hotel, address } : { address };
  }

  /** "65 Le Loi, Ben Nghe, District 1, HCM" → substring after the hotel name (used with tables). */
  private subAddress(raw?: string | null): string | null {
    if (!raw) return null;
    const comma = raw.indexOf(',');
    return comma === -1 ? null : raw.slice(comma + 1).trim() || null;
  }

  /** Sum Adult/Child/Infant counts in "1 Child 2 Adult 1 Infant".
   *  (?<!...) blocks times (07:30), month numbers (5/14), and long number sequences. */
  private sumPax(raw?: string): number | null | undefined {
    if (!raw) return undefined;
    const matches = raw.matchAll(
      /(?<![.:\d/)\-])(\d{1,2})\s*(?:adult|child|infant|pax|traveller|traveler|participant)s?/gi,
    );
    let total = 0;
    let found = false;
    for (const m of matches) {
      total += Number(m[1]);
      found = true;
    }
    return found ? total : undefined;
  }

  /** "2 adults • 1 child" / "3 participants" → pax. */
  private matchPax(text: string): number | undefined {
    const matches = text.matchAll(
      /(?<![.:\d/)\-])(\d{1,2})\s*(?:adult|child|infant|pax|traveller|traveler|participant)s?/gi,
    );
    let total = 0;
    let found = false;
    for (const m of matches) {
      total += Number(m[1]);
      found = true;
    }
    return found ? total : undefined;
  }

  private matchPhone(text: string): string | undefined {
    const m = /\b(\+?\d[\d\s().-]{8,17}\d)\b/.exec(text);
    return m ? m[1].replace(/[\s().-]/g, '') : undefined;
  }

  private matchDate(text: string): string | undefined {
    const viator =
      /(\d{1,2})\.([A-Za-z]{3,})[^@]*?'?(\d{2})?\s*@?\s*(\d{1,2}):(\d{2})/.exec(
        text,
      );
    if (viator) {
      const month = this.monthIndex(viator[2]);
      const yy = viator[3] ? Number(viator[3]) : undefined;
      if (month != null && yy != null) {
        const year = yy < 100 ? 2000 + yy : yy;
        const date = new Date(year, month, Number(viator[1]), Number(viator[4]), Number(viator[5]));
        if (!Number.isNaN(date.getTime())) return date.toISOString();
      }
    }
    const m =
      /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*(?:at\s*)?(\d{1,2}):(\d{2})?/.exec(
        text,
      );
    if (m) {
      const date = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0));
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    const plain = /([A-Z][a-z]{2,9}\.?\s+\d{1,2},?\s+2026)/.exec(text)?.[1];
    if (plain) {
      const date = new Date(plain);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    return undefined;
  }

  private monthIndex(name: string): number | undefined {
    const months = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    ];
    const index = months.indexOf(name.toLowerCase().slice(0, 3));
    return index === -1 ? undefined : index;
  }

  /** Rate/Product containing private/solo → PRIVATE_TOUR; shared/group/max → GROUP_TOUR. */
  private detectTourType(text: string): TourType | 'UNKNOWN' {
    const value = text.toLowerCase();
    if (/\b(private|solo|exclusive)\b/.test(value)) return TourType.PRIVATE_TOUR;
    if (/\b(shared|group|max)\b/.test(value)) return TourType.GROUP_TOUR;
    return 'UNKNOWN';
  }

  /** "Thu 14.May '26 @ 07:30" → ISO string in Vietnam timezone; fallback Date.parse. */
  private normalizeDate(raw?: string): string | undefined {
    if (!raw) return undefined;
    const iso = this.matchDate(raw);
    if (iso) return new Date(iso + '+07:00').toISOString();
    const d = new Date(raw + '+07:00');
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
}