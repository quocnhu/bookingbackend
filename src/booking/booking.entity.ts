import type { Booking } from '@prisma/client';

/** Alias model Prisma Booking cho pipeline (upsert key: source + confirmationCode). */
export type BookingEntity = Booking;

export const SOURCES = {
  AIRBNB: 'airbnb',
  BOOKING_COM: 'booking-com',
  TRIPADVISOR: 'tripadvisor',
  WEBSITE: 'website',
  MANUAL: 'manual',
} as const;

export type BookingSource = (typeof SOURCES)[keyof typeof SOURCES];
