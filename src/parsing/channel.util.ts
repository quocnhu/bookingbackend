import { BookingProvider } from '@prisma/client';

/**
 * Resolve the OTA provider from the free-text "Booking channel" / "Sold by"
 * values found in an email template (e.g. "Viator.com" → VIATOR,
 * "GetYourGuide" → GETYOURGUIDE). Because the Bókun relay delivers every OTA
 * through one mailbox, the sender cannot tell us the provider — these template
 * fields can. Returns undefined when nothing matches.
 */
const CHANNEL_MATCHERS: ReadonlyArray<readonly [RegExp, BookingProvider]> = [
  [/viator/i, BookingProvider.VIATOR],
  [/get\s*your\s*guide/i, BookingProvider.GETYOURGUIDE],
  [/booking\.com/i, BookingProvider.BOOKING_COM],
  [/airbnb/i, BookingProvider.AIRBNB],
  [/tripadvisor/i, BookingProvider.TRIPADVISOR],
  [/website/i, BookingProvider.WEBSITE],
];

export function resolveBookingChannel(
  ...candidates: Array<unknown>
): BookingProvider | undefined {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const text = candidate.trim();
    if (!text) continue;
    for (const [pattern, provider] of CHANNEL_MATCHERS) {
      if (pattern.test(text)) return provider;
    }
  }
  return undefined;
}
