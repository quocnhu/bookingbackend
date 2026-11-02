import type { BookingFields } from '../validation/booking-fields.schema';
import { AdvancedViatorParser } from './advanced-viator.parser';
export declare class AirportTransferParser extends AdvancedViatorParser {
    readonly templateTag = "airportTransfer";
    canParse(payload: Record<string, unknown>): boolean;
    extract(payload: Record<string, unknown>): BookingFields | null;
}
