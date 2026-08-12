import type { BookingFields, TemplateParser } from './parser.interface';
export declare class TripAdvisorParser implements TemplateParser {
    readonly templateTag = "tripadvisor";
    canParse(payload: Record<string, unknown>): boolean;
    extract(payload: Record<string, unknown>): BookingFields | null;
    private parseRows;
    private isKnownLabel;
    private setRow;
    private buildFromRows;
    private buildFromJson;
    private splitPickUp;
    private sumPax;
    private detectTourType;
    private normalizeDate;
    private monthIndex;
}
