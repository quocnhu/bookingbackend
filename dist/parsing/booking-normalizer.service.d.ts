import { BookingProvider } from '@prisma/client';
import type { BookingFields } from './validation/booking-fields.schema';
export interface CleanBookingData extends Omit<BookingFields, 'startingDate'> {
    startingDate?: string | undefined;
}
export type NormalizeAction = 'CREATE' | 'CANCEL' | 'SKIP';
export interface NormalizeResult {
    clean: boolean;
    reason?: string;
    data?: CleanBookingData;
}
export declare class BookingNormalizerService {
    normalize(payload: Record<string, unknown>, source?: string): NormalizeResult;
    channelForSource(source?: string): BookingProvider | undefined;
    private normalizeSource;
    private normalizeChannel;
    private normalizeTourType;
    private normalizePayment;
    private normalizeDate;
    private pickString;
    private pickNumber;
    private pickBoolean;
}
