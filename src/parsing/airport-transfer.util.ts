export type MailContent = {
  body?: unknown;
  html?: unknown;
  snippet?: unknown;
};

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const htmlToText = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
};

/** The product block of a Viator/Tripadvisor "Booking details" mail. */
export function airportTransferProduct(payload: MailContent): {
  product?: string;
  option?: string;
} {
  const text = [
    asString(payload.body),
    asString(payload.snippet),
    htmlToText(asString(payload.html)),
  ]
    .filter((part) => part.trim() !== '')
    .join('\n');

  const product = /product(?:\s+name)?\s*:\s*([^\n\r]+)/i
    .exec(text)?.[1]
    ?.trim();
  const option = /product\s+option\s*:\s*([^\n\r]+)/i.exec(text)?.[1]?.trim();

  return { product, option };
}

const AIRPORT_TRANSFER = /\bairport\s*transfer\b/i;
const TRANSFER_TO_FROM_AIRPORT =
  /\btransfer\s+(?:to|from)\s+(?:the\s+)?airport\b/i;

/**
 * True when the mail is an airport-transfer booking.
 *
 * Only the "Product name" / "Product Option" lines are inspected, so a customer
 * merely mentioning an airport transfer in a message does not re-route the mail.
 */
export function isAirportTransferMail(payload: MailContent): boolean {
  const { product = '', option = '' } = airportTransferProduct(payload);
  const text = `${product} ${option}`;
  return AIRPORT_TRANSFER.test(text) || TRANSFER_TO_FROM_AIRPORT.test(text);
}

/**
 * Refine a header-based template tag with the mail body.
 *
 * Message-centre conversation mails are tagged advancedViator (or viator from
 * the default sender rule) from their headers; an airport-transfer product in
 * the body must go to the private airportTransfer template instead.
 */
export function refineTemplateTag(tag: string, mail: MailContent): string {
  if (
    (tag === 'advancedViator' || tag === 'viator') &&
    isAirportTransferMail(mail)
  ) {
    return 'airportTransfer';
  }
  return tag;
}
