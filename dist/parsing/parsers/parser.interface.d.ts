import type { BookingFields } from '../validation/booking-fields.schema';
export interface TemplateParser {
    readonly templateTag: string;
    canParse(payload: Record<string, unknown>): boolean;
    extract(payload: Record<string, unknown>): BookingFields | null;
}
export type { BookingFields };
