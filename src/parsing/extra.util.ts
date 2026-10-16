/**
 * Keys the parsers/normalizer already map to dedicated Booking columns (or that
 * are pure bookkeeping). Everything else the parser extracts is kept verbatim in
 * `Booking.extra` (JSON), so new template fields automatically "fit" without a
 * schema change. Aliases are listed so the same value is never duplicated.
 */
const MAPPED_FIELDS = new Set<string>([
  'action',
  'bookingRef',
  'confirmationCode',
  'source',
  'channel',
  'status',
  'tourId',
  'tourName',
  'tour',
  'tourType',
  'address',
  'billingAddress',
  'latitude',
  'longitude',
  'startingDate',
  'date',
  'checkIn',
  'checkin',
  'tripDate',
  'customerName',
  'customer',
  'billingName',
  'hotelName',
  'pickUp',
  'pickUpAddress',
  'phone',
  'customerPhone',
  'mail',
  'customerEmail',
  'billingEmail',
  'emailAddress',
  'totalPax',
  'travellers',
  'paxTotal',
  'pax',
  'paxDetail',
  'priceLines',
  'payment',
  'isNoShow',
  'noShow',
  'noShowReason',
  'provider',
  'extra',
]);

/**
 * Build the dynamic `Booking.extra` payload from a parser's rich object:
 * keep every non-empty field that has no dedicated Booking column.
 */
export function buildExtra(
  rich: Record<string, unknown>,
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rich)) {
    if (MAPPED_FIELDS.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    extra[key] = value;
  }
  return extra;
}
