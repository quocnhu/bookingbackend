import type { BookingFields, TemplateParser } from './parser.interface';
export declare class BookingComParser implements TemplateParser {
    readonly templateTag = "booking-com";
    canParse(payload: Record<string, unknown>): boolean;
    extract(payload: Record<string, unknown>): BookingFields | null;
    private matchRef;
    private isCancellation;
    private matchGuest;
    private matchDates;
    private matchPax;
    private matchHotel;
    private matchAddress;
    private normalize;
}
