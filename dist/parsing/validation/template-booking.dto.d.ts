import { BookingProvider, BookingStatus, PaymentStatus, TourType } from '@prisma/client';
export type ParsedAction = 'CREATE' | 'CANCEL';
export declare const PARSED_ACTIONS: ParsedAction[];
export declare const PARSED_SOURCES: readonly ["airbnb", "booking-com", "getyourguide", "viator", "website", "manual"];
export declare class TemplateBookingDto {
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
    startingDate?: string | Date;
    customerName?: string;
    hotelName?: string;
    phone?: string;
    mail: string;
    totalPax?: number;
    paxDetail?: string;
    payment?: PaymentStatus;
    isNoShow?: boolean;
    noShowReason?: string;
    extra?: Record<string, unknown>;
}
