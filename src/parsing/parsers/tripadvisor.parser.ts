import { Injectable } from '@nestjs/common';
import { BookingProvider, TourType } from '@prisma/client';
import { load } from 'cheerio';
import type { BookingFields, TemplateParser } from './parser.interface';

/** Ép mọi value thành string an toàn (tránh '[object Object]'). */
const asString = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/**
 * TripAdvisor — template email là một bảng HTML: mỗi `tr` có 2 cell
 * (label bên trái → value bên phải). Mapping theo PROCESS_FLOW.md §5.2:
 *
 *   Booking Ref. → bookingRef   Customer Email → mail
 *   Product      → tourName     Customer Phone → phone
 *   Rate         → tourType     Date           → startingDate
 *   Pax          → totalPax     Pick-up        → hotelName + address
 *   Customer     → customerName Notes/Extras   → (lưu giữ nguyên)
 *
 * Vẫn hỗ trợ payload đã parse sẵn dạng JSON (`payload.booking`) từ flow cũ.
 */
@Injectable()
export class TripAdvisorParser implements TemplateParser {
  readonly templateTag = 'tripadvisor';

  canParse(payload: Record<string, unknown>): boolean {
    const from = asString(payload.from).toLowerCase();
    const subject = asString(payload.subject).toLowerCase();
    const html = asString(payload.html);
    const body = asString(payload.body);
    const hasParsedBooking = Boolean(payload.booking ?? payload.parsedBooking);

    return (
      from.includes('tripadvisor.com') ||
      subject.includes('tripadvisor') ||
      /\bBooking Ref\.?/i.test(html) ||
      /\bBooking Ref\.?/i.test(body) ||
      (hasParsedBooking &&
        (asString(payload.source).includes('tripadvisor') ||
          asString(payload.channel).toUpperCase() === 'TRIPADVISOR'))
    );
  }

  extract(payload: Record<string, unknown>): BookingFields | null {
    const html = asString(payload.html);
    const body = asString(payload.body);

    if (/\bBooking Ref\.?/i.test(html) || /\bBooking Ref\.?/i.test(body)) {
      const rows = this.parseRows(html || body);
      if (rows.size > 0) return this.buildFromRows(rows, payload);
    }

    if (payload.booking ?? payload.parsedBooking) {
      return this.buildFromJson(payload);
    }

    return null;
  }

  /** Đọc bảng: mỗi `tr` → [label, value]. Fallback regex khi không có cheerio. */
  private parseRows(raw: string): Map<string, string> {
    const rows = new Map<string, string>();
    const text = raw.replace(/<br\s*\/?>/gi, '\n');

    try {
      if (text.includes('<')) {
        const $ = load(text);
        $('tr').each((_, tr) => {
          const cells = $(tr)
            .find('td, th')
            .map((_, td) => $(td).text().trim())
            .get();
          if (cells.length >= 2)
            this.setRow(rows, cells[0], cells.slice(1).join(' '));
        });
        if (rows.size > 0) return rows;
      }
    } catch {
      // bỏ qua, fallback regex bên dưới
    }

    // Fallback: label 2-40 ký tự, theo sau là ':' rồi value tới hết dòng.
    const re = /([A-Za-z][A-Za-z .-]{2,40}?):\s*(.*)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const label = m[1].trim();
      const value = m[2].trim();
      if (label && value && this.isKnownLabel(label))
        this.setRow(rows, label, value);
    }

    return rows;
  }

  private isKnownLabel(label: string): boolean {
    const known = [
      'booking ref',
      'product booking ref',
      'ext booking ref',
      'product',
      'supplier',
      'sold by',
      'booking channel',
      'customer',
      'customer email',
      'customer phone',
      'date',
      'rate',
      'pax',
      'pick-up',
      'guided languages',
      'notes',
      'extras',
      'created',
    ];
    const normalized = label.toLowerCase().replace(/\.+$/, '');
    return known.some((k) => normalized.includes(k));
  }

  private setRow(rows: Map<string, string>, label: string, value: string) {
    const normalized = label.toLowerCase().replace(/\.+$/, '').trim();
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
      ['pick-up', 'pickUp'],
      ['booking languages', 'bookingLanguages'],
      ['customer', 'customer'],
      ['date', 'date'],
      ['rate', 'rate'],
      ['pax', 'pax'],
      ['notes', 'notes'],
      ['extras', 'extras'],
      ['created', 'created'],
    ];
    for (const [key, field] of keys) {
      if (normalized.startsWith(key)) {
        const current = rows.get(field);
        rows.set(field, current ? `${current}\n${value}` : value);
        return;
      }
    }
  }

  private buildFromRows(
    rows: Map<string, string>,
    payload: Record<string, unknown>,
  ): BookingFields | null {
    const bookingRef = rows.get('bookingRef') ?? rows.get('productBookingRef');
    if (!bookingRef) return null;

    const rate = rows.get('rate') ?? '';
    const product = rows.get('product') ?? '';
    const pickUp = this.splitPickUp(rows.get('pickUp'));

    const subject = asString(payload.subject);

    return {
      action: /\b(cancel(?:led|lation)?|refund(?:ed)?)\b/i.test(subject)
        ? 'CANCEL'
        : 'CREATE',
      bookingRef,
      source: 'tripadvisor',
      channel: BookingProvider.TRIPADVISOR,
      customerName: rows.get('customer') || undefined,
      mail:
        rows.get('customerEmail') ||
        asString(payload.emailAddress) ||
        undefined,
      phone: rows.get('customerPhone') || undefined,
      tourName: product || undefined,
      tourType: this.detectTourType(rate, product),
      startingDate: this.normalizeDate(rows.get('date')),
      totalPax: this.sumPax(rows.get('pax')),
      paxDetail: rows.get('pax') || undefined,
      hotelName: pickUp.hotel,
      address: pickUp.address,
    };
  }

  private buildFromJson(
    payload: Record<string, unknown>,
  ): BookingFields | null {
    const b = (payload.booking ?? payload.parsedBooking ?? {}) as Record<
      string,
      unknown
    >;
    const bookingRef = asString(b.bookingRef) || asString(payload.bookingRef);
    if (!bookingRef) return null;

    const rate = asString(b.rate);
    const product = asString(b.product ?? b.tourName ?? b.tour);
    const pickUp = this.splitPickUp(asString(b.pickUp));
    const subject = asString(payload.subject);

    return {
      action: /\b(cancel(?:led|lation)?|refund(?:ed)?)\b/i.test(subject)
        ? 'CANCEL'
        : 'CREATE',
      bookingRef,
      source: 'tripadvisor',
      channel: BookingProvider.TRIPADVISOR,
      customerName: asString(b.customer ?? b.customerName) || undefined,
      mail:
        asString(b.customerEmail ?? b.mail) ||
        asString(payload.emailAddress) ||
        undefined,
      phone: asString(b.customerPhone ?? b.phone) || undefined,
      tourName: product || undefined,
      tourType: this.detectTourType(rate, product),
      startingDate: this.normalizeDate(asString(b.date ?? b.startingDate)),
      totalPax: this.sumPax(asString(b.pax ?? b.paxTotal)),
      paxDetail: asString(b.pax ?? b.paxDetail) || undefined,
      hotelName: pickUp.hotel,
      address: pickUp.address,
    };
  }

  /** Tách hotel / địa chỉ tại dấu phẩy đầu tiên (PROCESS_FLOW.md §5.2). */
  private splitPickUp(raw?: string): { hotel?: string; address?: string } {
    const value = raw?.trim();
    if (!value) return {};
    const comma = value.indexOf(',');
    if (comma === -1) return { hotel: value };
    const hotel = value.slice(0, comma).trim();
    const address = value.slice(comma + 1).trim();
    return hotel ? { hotel, address } : { address };
  }

  /** Tính paxTotal từ "2 Adult" → 2; cộng dồn Adult/Child/Infant. */
  private sumPax(raw?: string): number | undefined {
    if (!raw) return undefined;
    const matches = raw.matchAll(/(\d+)\s*(?:adult|child|infant|pax)s?/gi);
    let total = 0;
    let found = false;
    for (const m of matches) {
      total += Number(m[1]);
      found = true;
    }
    return found ? total : undefined;
  }

  /** Rate/Product chứa private/solo → PRIVATE_TOUR; shared/group/max → GROUP_TOUR. */
  private detectTourType(rate: string, product: string): TourType | undefined {
    const text = `${rate} ${product}`.toLowerCase();
    if (/\b(private|solo|exclusive)\b/.test(text)) return TourType.PRIVATE_TOUR;
    if (/\b(shared|group|max)\b/.test(text)) return TourType.GROUP_TOUR;
    return undefined;
  }

  /** "Thu 14.May '26 @ 07:30" → ISO 2026-05-14T07:30:00.000Z */
  private normalizeDate(raw?: string): string | undefined {
    if (!raw) return undefined;
    const value = raw.trim();
    const m =
      /(\d{1,2})\.([A-Za-z]{2,})[^@]*?'?(\d{2})?\s*@?\s*(\d{1,2}):(\d{2})/.exec(
        value,
      );
    if (m) {
      const day = Number(m[1]);
      const month = this.monthIndex(m[2]);
      const yy = m[3] ? Number(m[3]) : undefined;
      const year = yy != null ? (yy < 100 ? 2000 + yy : yy) : undefined;
      const hour = Number(m[4]);
      const minute = Number(m[5]);
      if (month != null && year != null) {
        const date = new Date(year, month, day, hour, minute);
        if (!Number.isNaN(date.getTime())) return date.toISOString();
      }
    }
    const plain = new Date(value);
    return Number.isNaN(plain.getTime()) ? undefined : plain.toISOString();
  }

  private monthIndex(name: string): number | undefined {
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];
    const index = months.indexOf(name.toLowerCase().slice(0, 3));
    return index === -1 ? undefined : index;
  }
}
