import { BookingNormalizerService } from '../booking-normalizer.service';
import type { BookingFields, TemplateParser } from './parser.interface';
export declare class WebsiteParser implements TemplateParser {
    private readonly normalizer;
    readonly templateTag = "website";
    constructor(normalizer: BookingNormalizerService);
    canParse(payload: Record<string, unknown>): boolean;
    extract(payload: Record<string, unknown>): BookingFields | null;
    private parseHtml;
    private captureRow;
    private resolveBookingRef;
    private toFields;
    private detectTourType;
    private splitPickUp;
    private parseDollar;
    private parseNumber;
    private normalizeDate;
}
