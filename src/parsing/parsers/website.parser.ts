import { Injectable } from '@nestjs/common';
import { BookingProvider, TourType } from '@prisma/client';
import { load } from 'cheerio';
import { BookingNormalizerService } from '../booking-normalizer.service';
import type { BookingFields, TemplateParser } from './parser.interface';

/** Ép mọi value thành string an toàn (tránh '[object Object]'). */
const asString = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/** Collapse whitespace (nhiều dòng/indent trong cell → 1 dòng). */
const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim();

interface WebsiteBooking {
  provider: string;
  bookingRef: string | null;
  tourName: string | null;
  packageName: string | null;
  tourType: TourType | 'UNKNOWN';
  tripDate: string | null;
  travellers: number | null;
  priceLines: string | null;
  subtotal: number | null;
  discount: number | null;
  totalcost: number | null;
  billingName: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingCountry: string | null;
  pickUp: string | null;
  pickUpAddress: string | null;
  bookingLink: string | null;
}

/**
 * Website — email xác nhận từ WP Travel Engine (form đặt tour trên website).
 * Template là bảng HTML (xem src/check/website.txt):
 *
 *   Package Name → packageName   Trip Date   → startingDate
 *   Travellers    → totalPax     Subtotal/…   → priceLines + totalcost
 *   Name/Email/Billing Address   → customer/mail/address
 *   link wp-admin post.php?post= → bookingRef "WEB-<postId>"
 *
 * Hỗ trợ 3 nguồn:
 *   1. `payload.html`/`payload.body` chứa HTML → parse bảng trực tiếp.
 *   2. Plain-text body → regex fallback.
 *   3. `payload.booking` đã có JSON → normalize (backward-compat).
 * Dữ liệu giàu được lưu vào `payload.booking` để giữ trong rawData.payload.
 */
@Injectable()
export class WebsiteParser implements TemplateParser {
  readonly templateTag = 'website';

  constructor(private readonly normalizer: BookingNormalizerService) {}

  canParse(payload: Record<string, unknown>): boolean {
    const from = asString(payload.from).toLowerCase();
    const subject = asString(payload.subject).toLowerCase();
    const text = `${asString(payload.html)}\n${asString(payload.body)}`;

    const hasBooking = Boolean(payload.booking ?? payload.parsedBooking);
    if (hasBooking) {
      const rawSource = payload.source ?? payload.templateTag;
      const source =
        typeof rawSource === 'string' ? rawSource.toLowerCase() : '';
      if (source === 'website' || source === '' || source === 'unknown')
        return true;
    }

    return (
      from.includes('nquocnhu95book@gmail.com') ||
      subject.includes('new booking') ||
      /wptravelengine|wp travel engine/i.test(text) ||
      text.includes('Billing Details') ||
      /\bwp-admin\/post\.php\?post=\d+/i.test(text)
    );
  }

  extract(payload: Record<string, unknown>): BookingFields | null {
    const html = asString(payload.html);
    const body = asString(payload.body);
    const text = html || body;

    const rich = this.parseHtml(text, payload);
    if (rich) {
      payload.booking = rich;
      return this.toFields(rich, payload);
    }

    const result = this.normalizer.normalize(payload, 'website');
    return result.clean ? result.data! : null;
  }

  /** Parse template website (HTML bảng hoặc plain-text fallback). */
  private parseHtml(
    raw: string,
    payload: Record<string, unknown>,
  ): WebsiteBooking | null {
    if (!raw || !raw.trim()) return null;
    const text = raw.replace(/<br\s*\/?>/gi, '\n');
    const isHtml = text.includes('<');

    const rows = new Map<string, string>();
    const priceLinesParts: string[] = [];
    let tourName: string | null = null;
    let bookingLink: string | null = null;

    if (isHtml) {
      const $ = load(text);
      tourName = $('td b').first().text().replace(/\s+/g, ' ').trim() || null;
      bookingLink =
        $('a[href*="wp-admin"][href*="action=edit"]').attr('href') || null;

      $('tr').each((_, row) => {
        const cells = $(row)
          .find('td, th')
          .map((_, td) => $(td).text().replace(/\s+/g, ' ').trim())
          .get();
        if (cells.length < 2) return;
        const key = cells[0].trim();
        const val = cells.slice(1).join(' ').trim();
        this.captureRow(rows, priceLinesParts, key, val);
      });
    } else {
      // Plain-text fallback: "Label" / "Label : value" mỗi dòng.
      const linkMatch =
        /(https?:\/\/[^\s]+wp-admin\/post\.php\?post=\d+[^\s]*)/i.exec(text);
      bookingLink = linkMatch ? linkMatch[1] : null;

      for (const line of text.split('\n')) {
        const m = /^([A-Za-z][A-Za-z ]{2,40}?):\s*(.*)$/.exec(line.trim());
        if (m) this.captureRow(rows, priceLinesParts, m[1].trim(), m[2].trim());
      }
      // Tour name = dòng in đậm đầu tiên, thường nằm trên "Package Name".
      const heading = /^(.{4,120})$/.exec(text.trim().split('\n')[0]);
      if (heading && !tourName) tourName = heading[1].trim();
    }

    const bookingRef = this.resolveBookingRef(bookingLink, payload);
    if (!bookingRef) return null;

    const tripDate = rows.get('tripDate') || null;
    const travellers = this.parseNumber(rows.get('travellers'));
    const subtotal = this.parseDollar(rows.get('subtotal'));
    const discount = this.parseDollar(rows.get('discount'));
    const total = this.parseDollar(rows.get('total'));
    const priceLines =
      priceLinesParts.length > 0 ? priceLinesParts.join(', ') : null;

    const billingName = rows.get('billingName') || null;
    const billingEmail = rows.get('billingEmail') || null;
    const billingAddress = rows.get('billingAddress') || null;
    const billingCity = rows.get('billingCity') || null;
    const billingCountry = rows.get('billingCountry') || null;

    const packageName = rows.get('packageName') || null;
    const tourType = this.detectTourType(packageName, tourName);
    const pickUp = this.splitPickUp(billingAddress);

    return {
      provider: 'website',
      bookingRef,
      tourName,
      packageName,
      tourType,
      tripDate,
      travellers,
      priceLines,
      subtotal,
      discount,
      totalcost: total,
      billingName,
      billingEmail,
      billingAddress,
      billingCity,
      billingCountry,
      pickUp: pickUp.hotel ?? null,
      pickUpAddress: pickUp.address ?? null,
      bookingLink,
    };
  }

  /** Ghi một dòng bảng vào rows / priceLinesParts theo key đã biết. */
  private captureRow(
    rows: Map<string, string>,
    priceLinesParts: string[],
    key: string,
    val: string,
  ): void {
    const normalized = collapse(key);
    const value = collapse(val);

    const mapping: Array<[string, string]> = [
      ['package name', 'packageName'],
      ['trip date', 'tripDate'],
      ['travellers', 'travellers'],
      ['subtotal', 'subtotal'],
      ['discount', 'discount'],
      ['total', 'total'],
      ['billing address', 'billingAddress'],
      ['name', 'billingName'],
      ['email', 'billingEmail'],
      ['city', 'billingCity'],
      ['country', 'billingCountry'],
    ];
    for (const [needle, field] of mapping) {
      if (normalized.toLowerCase().includes(needle)) {
        rows.set(field, value);
        break;
      }
    }

    // Dòng kiểu "Adult" | "2 X $25 = $50" → price line.
    const priceMatch = /^(\d+)\s*[Xx]\s*\$([0-9.]+)\s*=\s*\$([0-9.]+)$/.exec(
      value,
    );
    if (priceMatch && key && !normalized.toLowerCase().includes('subtotal')) {
      priceLinesParts.push(
        `${key}: ${priceMatch[1]}x$${priceMatch[2]}=$${priceMatch[3]}`,
      );
    }
  }

  /** "post=3286" → "WEB-3286"; fallback dùng threadId/messageId để ổn định retry. */
  private resolveBookingRef(
    bookingLink: string | null,
    payload: Record<string, unknown>,
  ): string | null {
    if (bookingLink) {
      const postId = /post=(\d+)/.exec(bookingLink)?.[1];
      if (postId) return `WEB-${postId}`;
    }
    const stableId = asString(payload.threadId) || asString(payload.messageId);
    if (stableId) return `WEB-FALLBACK-${stableId}`;
    return null;
  }

  /** Chuyển dữ liệu giàu sang BookingFields (khớp model Prisma Booking). */
  private toFields(
    rich: WebsiteBooking,
    payload: Record<string, unknown>,
  ): BookingFields {
    const subject = asString(payload.subject);
    return {
      action: /\b(cancel(?:led|lation)?|refund(?:ed)?)\b/i.test(subject)
        ? 'CANCEL'
        : 'CREATE',
      bookingRef: rich.bookingRef!,
      source: 'website',
      channel: BookingProvider.WEBSITE,
      customerName: rich.billingName || undefined,
      mail: rich.billingEmail || undefined,
      startingDate: this.normalizeDate(rich.tripDate),
      totalPax: rich.travellers ?? undefined,
      paxDetail: rich.priceLines || undefined,
      tourName: rich.tourName || undefined,
      tourType: rich.tourType === 'UNKNOWN' ? undefined : rich.tourType,
      hotelName: rich.pickUp || undefined,
      address: rich.pickUpAddress || rich.billingAddress || undefined,
    };
  }

  /** private/solo → PRIVATE_TOUR; shared/group/max → GROUP_TOUR. */
  private detectTourType(
    packageName: string | null,
    tourName: string | null,
  ): TourType | 'UNKNOWN' {
    const text = `${packageName ?? ''} ${tourName ?? ''}`.toLowerCase();
    if (/\b(private|solo|exclusive)\b/.test(text)) return TourType.PRIVATE_TOUR;
    if (/\b(shared|group|max)\b/.test(text)) return TourType.GROUP_TOUR;
    return 'UNKNOWN';
  }

  /** Tách hotel / địa chỉ tại dấu phẩy (ưu tiên từ khoá khách sạn). */
  private splitPickUp(raw?: string | null): {
    hotel?: string;
    address?: string;
  } {
    const value = raw?.trim();
    if (!value) return {};
    const clean = collapse(value);
    const hotelPattern =
      /^([^,]+?\b(?:Residence|Hotel|Apartment|Apartments|Suite|Suites|Villa|Villas|Stay|Hostel|Homestay|Spa)\b)(?:,\s*)(.*)$/i;
    const match = clean.match(hotelPattern);
    if (match) return { hotel: match[1], address: match[2] };
    const comma = clean.indexOf(',');
    if (comma === -1) return { hotel: clean };
    const hotel = clean.slice(0, comma).trim();
    const address = clean.slice(comma + 1).trim();
    return hotel ? { hotel, address } : { address };
  }

  private parseDollar(raw?: string | null): number | null {
    if (!raw) return null;
    const parsed = parseFloat(raw.replace(/[^0-9.]/g, ''));
    return Number.isNaN(parsed) ? null : parsed;
  }

  private parseNumber(raw?: string | null): number | null {
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private normalizeDate(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
}
