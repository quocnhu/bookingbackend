import type { BookingFields, TemplateParser } from './parser.interface';
export declare class AirbnbParser implements TemplateParser {
    readonly templateTag = "airbnb";
    canParse(payload: Record<string, unknown>): boolean;
    extract(payload: Record<string, unknown>): BookingFields | null;
    private matchRef;
    private cleanRef;
    private isCancellation;
    private matchGuest;
    private matchStartDate;
    private matchEndDate;
    private matchPax;
    private matchAddress;
    private matchPhone;
    private normalizeDate;
}
