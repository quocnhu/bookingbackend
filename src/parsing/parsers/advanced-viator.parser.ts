import { Injectable } from '@nestjs/common';
import { BookingProvider, TourType } from '@prisma/client';
import { detectAction } from '../action.util';
import { resolveBookingChannel } from '../channel.util';
import { buildExtra } from '../extra.util';
import { isRoutedToTag } from '../template.util';
import type { BookingFields } from '../validation/booking-fields.schema';
import type { TemplateParser } from './parser.interface';

const asString = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const MONTHS = [
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

/**
 * Viator "Conversation with …" (Tripadvisor expmessaging) mails.
 *
 * These are NOT the standard Viator confirmation template: they are the
 * customer replying inside the Viator/Tripadvisor message centre. The mail
 * carries a "Booking details" block with the same booking (BR- reference) plus
 * the free-text message of the customer (pickup point, WhatsApp, wishes…).
 *
 * The same sender also delivers the CANCELLATION and the AMENDMENT of a
 * booking — the parser detects the action (new booking / cancel / amend) and
 * the booking is pushed to the Booking table accordingly.
 *
 * The booking source stays 'viator' on purpose: the upsert key is
 * (source, bookingRef), so a conversation mail updates the booking created by
 * the standard Viator confirmation instead of duplicating it.
 */
@Injectable()
export class AdvancedViatorParser implements TemplateParser {
  readonly templateTag = 'advancedViator';

  /**
   * Only the conversation template: it always carries the "Booking details"
   * block with a "Lead Traveler" line. The standard Viator confirmation does
   * not have one — that stays with the regular `viator` parser.
   */
  canParse(payload: Record<string, unknown>): boolean {
    const text = this.flatten(payload);
    const subject = asString(payload.subject);
    const from = asString(payload.from);

    // The details block of a conversation mail (the standard Viator template
    // has "Booking Ref.", "Product", "Customer"… — not these labels).
    const hasDetails =
      /lead traveler\s*:/i.test(text) && /product option\s*:/i.test(text);
    const hasRef =
      /booking reference\s*:/i.test(text) || /\bBR-?\d{4,}\b/i.test(text);
    if (!hasRef) return false;

    if (hasDetails) return true;

    if (/conversation with\b/i.test(subject) && /booking details/i.test(text)) {
      return true;
    }

    // A cancellation / an amendment of the message centre may carry the
    // reference WITHOUT the full "Booking details" block. It still belongs to
    // this template — otherwise the standard Viator parser would grab it and
    // the cancellation would never reach the Booking table.
    if (this.isMessageCentre(from) && this.isStateChange(subject, text)) {
      return true;
    }

    return false;
  }

  extract(payload: Record<string, unknown>): BookingFields | null {
    const text = this.flatten(payload);
    if (!text.trim()) return null;

    const labels = this.readLabels(text);
    const subject = asString(payload.subject);

    // The action is read from the whole mail (text + snippet + HTML): the
    // "your booking has been cancelled" sentence can sit in any part.
    const action = detectAction(subject, text);

    const bookingRef = this.bookingRef(subject, text, labels);
    if (!bookingRef) return null;

    const product =
      labels.get('product name') ??
      labels.get('product') ??
      this.extractLabel(text, ['product name']) ??
      '';
    const productOption =
      labels.get('product option') ??
      labels.get('option') ??
      this.extractLabel(text, ['product option']) ??
      '';
    const travelLineStr =
      labels.get('travel date/pax') ??
      labels.get('travel date / pax') ??
      labels.get('travel date') ??
      this.extractLabel(text, ['travel date/pax', 'travel date / pax']);
    const travel = this.travelLine(travelLineStr);
    const pickUp =
      this.splitPickUp(
        labels.get('pickup point') ?? this.extractLabel(text, ['pickup point']),
      );
    const customerMessage = this.customerMessage(text);

    const leadTraveler =
      labels.get('lead traveler') ??
      labels.get('lead traveller') ??
      labels.get('traveler') ??
      labels.get('traveller') ??
      this.extractLabel(text, ['lead traveler', 'lead traveller']);
    const customerName =
      leadTraveler ||
      // The subject salutation is a SHORT form ("Pablo M"). It may only name a
      // NEW booking — a cancellation/amendment must not downgrade the full
      // name already stored on the booking.
      (action === 'CREATE' ? this.fromSalutation(subject) : undefined) ||
      undefined;
    const phone =
      labels.get('phone number') ??
      labels.get('phone') ??
      labels.get('contact number') ??
      this.extractLabel(text, ['phone number']) ??
      undefined;
    const mail = this.customerMail(text, payload);

    const startingDate = this.startingDate(travel.date, {
      productOption,
      customerMessage,
      mailDate: asString(payload.date),
    });

    const totalPax = this.sumPax(travel.pax);
    const paxDetail = travel.pax || undefined;

    const fields: BookingFields = {
      action,
      bookingRef,
      source: 'viator',
      channel:
        resolveBookingChannel(product, productOption, payload.from) ??
        BookingProvider.VIATOR,
      customerName: customerName || undefined,
      mail: mail.address,
      phone,
      tourName: product || undefined,
      tourType: this.detectTourType(productOption, product),
      startingDate,
      totalPax,
      paxDetail,
      hotelName: pickUp.hotel || undefined,
      address: pickUp.address || undefined,
    };

    // Everything that has no dedicated Booking column is kept verbatim in
    // Booking.extra — the customer's message is the important part here.
    const rich: Record<string, unknown> = {
      provider: 'viator',
      template: this.templateTag,
      productName: product || null,
      productOption: productOption || null,
      bookingRef,
      leadTraveler: leadTraveler ?? null,
      phoneNumber: phone ?? null,
      travelDatePax: travelLineStr ?? null,
      pickupPoint: pickUp.hotel || pickUp.address ? [pickUp.hotel, pickUp.address].filter(Boolean).join(', ') : (labels.get('pickup point') ?? null),
      customerMessage: customerMessage || null,
      whatsapp: this.whatsapp(customerMessage) ?? null,
      customerEmail: mail.address ?? null,
      // 'thread-relay' = the address is the Viator thread relay, NOT the
      // customer email. The merge must not overwrite a real customer email
      // with it (see buildEmailUpdateData).
      mailSource: mail.isRelay ? 'thread-relay' : 'customer',
      conversationFrom: this.addressFrom(asString(payload.from)) ?? null,
      viatorBookingId: this.viatorBookingId(text) ?? null,
      viatorRef: this.viatorRef(text) ?? null,
      mailDate: asString(payload.date) || null,
      tourType: fields.tourType ?? 'UNKNOWN',
      startingDate: fields.startingDate ?? null,
      paxTotal: fields.totalPax ?? null,
    };
    payload.booking = rich;
    fields.extra = buildExtra(rich);

    return fields;
  }

  /** The mail comes from the Viator/Tripadvisor message centre. */
  private isMessageCentre(from: string): boolean {
    if (from.toLowerCase().includes('expmessaging.tripadvisor.com')) {
      return true;
    }
    // Senders that MAIL_TEMPLATE_PREFIX_RULES route to this template (via a
    // From rule) count as message-centre senders too — e.g. a test forwarder.
    // Without this, a cancellation from such an address (no "Booking details"
    // block) would be claimed by another parser and never reach the booking.
    return isRoutedToTag({ from, subject: '' }, 'advancedViator');
  }

  /** The mail announces a cancellation or an amendment. */
  private isStateChange(subject: string, text: string): boolean {
    return detectAction(subject, text) !== 'CREATE';
  }

  /** The plain text of the mail (text/plain body, plus the HTML flattened). */
  private flatten(payload: Record<string, unknown>): string {
    const parts = [
      asString(payload.body),
      asString(payload.snippet),
      this.htmlToText(asString(payload.html)),
    ];
    const combined = parts.filter((p) => p.trim() !== '').join('\n');
    // Unwrap forwarded messages (Gmail "Fwd:" / "--- Forwarded message ---")
    return this.unwrapForward(combined);
  }

  private unwrapForward(text: string): string {
    // Gmail style
    const markers = [
      /[-]{3,}\s*forwarded message\s*[-]{3,}/i,
      /begin forwarded message:/i,
    ];
    for (const m of markers) {
      const idx = text.search(m);
      if (idx >= 0) {
        return text.slice(idx);
      }
    }
    return text;
  }

  /** Very small HTML → text (block tags become newlines, entities decoded). */
  private htmlToText(html: string): string {
    if (!html) return '';
    return html
      .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Collect the "Label: value" lines of the "Booking details" block.
   * Later occurrences win (the details block is at the end of the mail).
   */
  private readLabels(text: string): Map<string, string> {
    const out = new Map<string, string>();

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;

      // Also handle bullet/list style "  - Label: value"
      const cleaned = line.replace(/^[-*•\u2022]\s+/, '');
      const m = /^([A-Za-z][A-Za-z0-9 /()'_-]{0,60}):\s*(.+)$/.exec(cleaned);
      if (!m) continue;

      const label = m[1].trim().toLowerCase();
      const value = m[2].trim().replace(/\.$/, '');
      if (!value) continue;

      out.set(label, value);
    }

    return out;
  }

  private extractLabel(text: string, names: string[]): string | undefined {
    for (const name of names) {
      const re = new RegExp(
        String.raw`(?:^|\n)\s*[-*•\u2022]?\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*:\s*(.+)`,
        'im',
      );
      const m = re.exec(text);
      if (m) {
        const v = m[1].trim().replace(/\.$/, '');
        if (v) return v;
      }
    }
    return undefined;
  }

  /** "BR-1457720525" (details block) → "BR-1457720525" (subject fallback). */
  private bookingRef(
    subject: string,
    text: string,
    labels: Map<string, string>,
  ): string | undefined {
    const fromLabel = labels.get('booking reference');
    if (fromLabel) {
      const m = /(BR-?\d+)/i.exec(fromLabel);
      if (m) return m[1].toUpperCase();
    }

    const m = /\b(BR-?\d+)\b/i.exec(subject) ?? /\b(BR-?\d+)\b/i.exec(text);
    return m ? m[1].toUpperCase() : undefined;
  }

  /** "Mon Oct 19, 2026 - 2 Adults" → { date: 'Mon Oct 19, 2026', pax: '2 Adults' }. */
  private travelLine(raw?: string): { date?: string; pax?: string } {
    if (!raw) return {};
    const parts = raw.split(/\s+-\s+/);
    const date = parts[0]?.trim() || undefined;
    const pax = parts.slice(1).join(' - ').trim() || undefined;
    return { date, pax };
  }

  /** "2 Adults" → 2 (sums adult/child/infant). */
  private sumPax(raw?: string): number | undefined {
    if (!raw) return undefined;
    const matches = raw.matchAll(
      /(\d+)\s*(?:adult|child|infant|pax|person|people)s?/gi,
    );
    let total = 0;
    let found = false;
    for (const m of matches) {
      total += Number(m[1]);
      found = true;
    }
    return found ? total : undefined;
  }

  /** Split the pickup point at the first comma (hotel, address). */
  private splitPickUp(raw?: string): { hotel?: string; address?: string } {
    const value = raw?.trim();
    if (!value) return {};
    const comma = value.indexOf(',');
    if (comma === -1) return { hotel: value };
    const hotel = value.slice(0, comma).trim();
    const address = value.slice(comma + 1).trim();
    return hotel ? { hotel, address } : { address };
  }

  /** "Shared Group Morning/Noon Trip 07:30" → GROUP_TOUR. */
  private detectTourType(
    productOption: string,
    product: string,
  ): TourType | undefined {
    const text = `${productOption} ${product}`.toLowerCase();
    if (/\b(private|solo|exclusive)\b/.test(text)) return TourType.PRIVATE_TOUR;
    if (/\b(shared|group|max)\b/.test(text)) return TourType.GROUP_TOUR;
    return undefined;
  }

  /**
   * The tour date. The "Travel date/Pax" line is authoritative ("Mon Oct 19,
   * 2026"); the start time comes from the product option ("… Trip 07:30") or
   * from the customer's message ("7:30 AM"). Vietnam time (+07:00).
   */
  private startingDate(
    dateRaw: string | undefined,
    ctx: {
      productOption: string;
      customerMessage: string;
      mailDate: string;
    },
  ): string | undefined {
    const time = this.time(ctx.productOption) ?? this.time(ctx.customerMessage);

    const day = this.parseDate(dateRaw, ctx.mailDate);
    if (!day) return undefined;

    const naive = `${day}T${time ?? '00:00'}:00`;
    const parsed = new Date(`${naive}+07:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  /** "Mon Oct 19, 2026" / "October 19" → 'YYYY-MM-DD'. */
  private parseDate(raw?: string, mailDate?: string): string | undefined {
    if (raw) {
      const m =
        /([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/.exec(
          raw,
        );
      if (m) {
        const month = this.monthIndex(m[1]);
        const year = m[3] ? Number(m[3]) : this.yearFrom(mailDate);
        if (month != null && year != null) {
          return `${year}-${String(month + 1).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
        }
      }
    }
    return undefined;
  }

  /** "07:30" / "7:30 AM" → 'HH:mm'. */
  private time(raw?: string): string | undefined {
    if (!raw) return undefined;
    const m = /(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(raw);
    if (!m) return undefined;

    let hour = Number(m[1]);
    const minute = Number(m[2]);
    const meridiem = m[3]?.toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (hour > 23 || minute > 59) return undefined;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  /** The year of the mail (Date header) — used when the date has no year. */
  private yearFrom(mailDate?: string): number | undefined {
    if (!mailDate) return undefined;
    const m = /(\d{4})/.exec(mailDate);
    if (!m) return undefined;
    const year = Number(m[1]);
    return year > 1970 && year < 3000 ? year : undefined;
  }

  private monthIndex(name: string): number | undefined {
    const idx = MONTHS.indexOf(name.trim().slice(0, 3).toLowerCase());
    return idx === -1 ? undefined : idx;
  }

  /** The customer's free-text message (between the reply line and the details). */
  private customerMessage(text: string): string {
    const start = text.indexOf('wrote:');
    if (start === -1) return '';
    const rest = text.slice(start + 'wrote:'.length);
    const end = rest.search(/booking details/i);
    return (end === -1 ? rest : rest.slice(0, end)).trim();
  }

  /** "+506 7105 9897" (WhatsApp mentioned in the message). */
  private whatsapp(message: string): string | undefined {
    const m = /whatsapp[^\d+]*(\+?\d[\d\s().-]*\d)/i.exec(message);
    return m ? m[1].trim() : undefined;
  }

  /** The numeric Viator booking id ("Booking 1787449424"). */
  private viatorBookingId(text: string): string | undefined {
    const m = /\bbooking\s+(\d{6,})\b/i.exec(text);
    return m ? m[1] : undefined;
  }

  /** The numeric Viator ref ("/ ref 1457720525"). */
  private viatorRef(text: string): string | undefined {
    const m = /\bref\s+(\d{6,})\b/i.exec(text);
    return m ? m[1] : undefined;
  }

  /** "Conversation with Pablo M about …" → 'Pablo M'. */
  private fromSalutation(subject: string): string | undefined {
    const m = /^conversation with\s+(.+?)(?:\s+about\b|\s+re\b|$)/i.exec(
      subject.trim(),
    );
    return m ? m[1].trim() : undefined;
  }

  /**
   * The customer email. The conversation mails have none (the customer writes
   * through the Viator message centre), so we use the thread relay address
   * (the From of the mail) and fall back to the mailbox address. A real
   * customer email mentioned in the message always wins.
   *
   * `isRelay` tells the caller that the address is the THREAD relay
   * (NOT-<uuid>@expmessaging.tripadvisor.com) and not a customer email.
   */
  private customerMail(
    text: string,
    payload: Record<string, unknown>,
  ): { address?: string; isRelay: boolean } {
    const relay = this.addressFrom(asString(payload.from));
    const mailbox = asString(payload.emailAddress);

    const mentioned = text.match(
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    );
    for (const mail of mentioned ?? []) {
      const lower = mail.toLowerCase();
      if (lower === relay?.toLowerCase() || lower === mailbox.toLowerCase())
        continue;
      // Any address of the message-centre domain is a relay address too.
      if (this.isMessageCentre(mail)) continue;
      return { address: mail, isRelay: false };
    }

    return {
      address: relay || (mailbox ? mailbox : undefined),
      isRelay: true,
    };
  }

  /** "Viator <not-x@y.com>" → 'not-x@y.com'. */
  private addressFrom(from: string): string | undefined {
    const m = /<([^>]+)>/.exec(from);
    const address = (m ? m[1] : from).trim();
    return address.includes('@') ? address : undefined;
  }
}
