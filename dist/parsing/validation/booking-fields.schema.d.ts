import { BookingProvider, BookingStatus, PaymentStatus, TourType } from '@prisma/client';
import { ParsedAction, PARSED_SOURCES } from './template-booking.dto';
export type { ParsedAction };
export { PARSED_SOURCES };
export interface BookingFields {
    action: ParsedAction;
    bookingRef: string;
    source: string;
    channel?: BookingProvider;
    status?: BookingStatus;
    tourId?: string;
    tourName?: string;
    tourType?: TourType;
    address?: string;
    latitude?: number;
    longitude?: number;
    startingDate?: string;
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
    extra?: Record<string, unknown>;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    data?: BookingFields;
}
export declare function validateBookingFields(fields: BookingFields): ValidationResult;
