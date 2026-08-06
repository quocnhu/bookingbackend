import { BookingProvider, PaymentStatus, TourType } from '@prisma/client';
export type NormalizeAction = 'CREATE' | 'CANCEL' | 'SKIP';
export interface CleanBookingData {
    action: NormalizeAction;
    bookingRef?: string;
    channel?: BookingProvider;
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
export interface NormalizeResult {
    clean: boolean;
    reason?: string;
    data?: CleanBookingData;
}
export declare class BookingNormalizerService {
    normalize(payload: Record<string, unknown>): NormalizeResult;
    private normalizeChannel;
    private normalizeTourType;
    private normalizePayment;
    private normalizeDate;
    private pickString;
    private pickNumber;
    private pickBoolean;
}
