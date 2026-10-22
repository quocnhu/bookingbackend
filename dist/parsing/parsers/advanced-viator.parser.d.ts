import type { BookingFields } from '../validation/booking-fields.schema';
import type { TemplateParser } from './parser.interface';
export declare class AdvancedViatorParser implements TemplateParser {
    readonly templateTag = "advancedViator";
    canParse(payload: Record<string, unknown>): boolean;
    extract(payload: Record<string, unknown>): BookingFields | null;
    private isMessageCentre;
    private isStateChange;
    private flatten;
    private htmlToText;
    private readLabels;
    private bookingRef;
    private travelLine;
    private sumPax;
    private splitPickUp;
    private detectTourType;
    private startingDate;
    private parseDate;
    private time;
    private yearFrom;
    private monthIndex;
    private customerMessage;
    private whatsapp;
    private viatorBookingId;
    private viatorRef;
    private fromSalutation;
    private customerMail;
    private addressFrom;
}
