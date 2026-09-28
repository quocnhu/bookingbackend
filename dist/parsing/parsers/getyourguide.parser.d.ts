import type { BookingFields, TemplateParser } from './parser.interface';
export declare class GetYourGuideParser implements TemplateParser {
    readonly templateTag = "getyourguide";
    canParse(payload: Record<string, unknown>): boolean;
    extract(payload: Record<string, unknown>): BookingFields | null;
    private parseTable;
    private setRow;
    private fromJson;
    private parsePlain;
    private toFields;
    private splitPickUp;
    private subAddress;
    private sumPax;
    private matchPax;
    private matchPhone;
    private matchDate;
    private monthIndex;
    private detectTourType;
    private normalizeDate;
}
