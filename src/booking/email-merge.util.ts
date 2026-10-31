import {
  BookingProvider,
  BookingStatus,
  PaymentStatus,
  Prisma,
  TourType,
} from '@prisma/client';

/**
 * The values one parsed email carries.
 *
 * Deliberately free of defaults: an amendment email must only write the
 * fields it actually carried, so the merge can tell "absent" from "empty".
 */
export type EmailFields = {
  bookingRef: string;
  source?: string;
  channel: BookingProvider;
  tourId?: string;
  tourName?: string;
  tourType?: TourType;
  address?: string;
  latitude?: number;
  longitude?: number;
  startingDate?: Date;
  departureTime?: string;
  customerName?: string;
  hotelName?: string;
  phone?: string;
  mail?: string;
  totalPax?: number;
  paxDetail?: string;
  payment?: PaymentStatus;
  isNoShow?: boolean;
  noShowReason?: string;
  extra?: Prisma.InputJsonValue;
  emailDate?: Date;
};

/** The parts of the stored booking the merge needs. */
export type ExistingBooking = {
  status: BookingStatus;
  mail?: string | null;
  extra?: Prisma.JsonValue | null;
};

/**
 * Field-level merge for an email-driven update.
 *
 * Only the fields the email actually carried are written. The previous
 * blanket overwrite replaced the missing ones with '' / 0, so an amendment
 * email that mentioned only the new date silently BLANKED the hotel, the
 * phone and the pax count.
 *
 * Two things are deliberately NOT touched:
 *  - the identity (bookingRef / source) — the reference is the dedupe key
 *    and must never change on an update;
 *  - the lifecycle status — an amendment must not drag an ASSIGNED booking
 *    back to PENDING. Only a cancellation moves the booking.
 */
export function buildEmailUpdateData(
  parsed: EmailFields,
  existing: ExistingBooking,
  action: 'CREATE' | 'MODIFY' | 'CANCEL',
): Prisma.BookingUncheckedUpdateInput {
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined) continue;
    data[key] = value;
  }

  // Identity is immutable on an update.
  delete data.bookingRef;
  delete data.source;

  // A Viator message-centre mail (advancedViator template) carries the THREAD
  // relay address (NOT-<uuid>@expmessaging.tripadvisor.com), and a template
  // without a customer email falls back to the sender address. Neither is the
  // customer email, so they must never overwrite one already stored on the
  // booking — the mail only ADDS information to the confirmation booking.
  if (isFallbackMail(parsed) && existing.mail) {
    delete data.mail;
  }

  // `extra` is merged, never replaced: a template field that only the
  // original email carried must survive the amendment.
  const mergedExtra = {
    ...((existing.extra ?? {}) as Record<string, unknown>),
    ...((parsed.extra ?? {}) as Record<string, unknown>),
  };
  if (Object.keys(mergedExtra).length) data.extra = mergedExtra;
  else delete data.extra;

  // Only a cancellation changes the lifecycle state.
  data.status = action === 'CANCEL' ? BookingStatus.CANCELED : existing.status;

  return data;
}

/**
 * Did the update actually change anything?
 *
 * `emailDate` is metadata (it changes on every email) and `extra` is a merged
 * JSON blob — neither counts as a change on its own. A re-sent confirmation
 * of a booking we already have therefore reports "nothing changed".
 */

/**
 * Does the mail carry a sender/thread address instead of a customer email?
 * Parsers flag this in `extra.mailSource`.
 */
function isFallbackMail(parsed: EmailFields): boolean {
  const extra = parsed.extra as unknown as Record<string, unknown> | undefined;
  return (
    extra?.mailSource === 'thread-relay' ||
    extra?.mailSource === 'sender-fallback'
  );
}

export function hasBookingChanges(
  data: Prisma.BookingUncheckedUpdateInput,
  existing: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(data)) {
    if (key === 'emailDate' || key === 'extra') continue;
    if (value instanceof Date) {
      const before = existing[key];
      if (before instanceof Date && before.getTime() === value.getTime()) {
        continue;
      }
      return true;
    }
    if (existing[key] !== value) return true;
  }
  return false;
}
