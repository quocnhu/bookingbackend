import type { Booking } from '@prisma/client';
export type BookingEntity = Booking;
export declare const SOURCES: {
    readonly AIRBNB: "airbnb";
    readonly BOOKING_COM: "booking-com";
    readonly TRIPADVISOR: "tripadvisor";
    readonly WEBSITE: "website";
    readonly MANUAL: "manual";
};
export type BookingSource = (typeof SOURCES)[keyof typeof SOURCES];
