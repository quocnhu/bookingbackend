import { BookingProvider, BookingStatus, PaymentStatus, TourType } from '@prisma/client';
export type ParsedAction = 'CREATE' | 'CANCEL';
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
    customerName?: string;
    hotelName?: string;
    phone?: string;
    mail?: string;
    totalPax?: number;
    paxDetail?: string;
    payment?: PaymentStatus;
    isNoShow?: boolean;
    noShowReason?: string;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    data?: BookingFields;
}
export declare function validateBookingFields(fields: BookingFields): ValidationResult;
