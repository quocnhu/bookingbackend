import type { BookingFields } from '../validation/booking-fields.schema';

/**
 * Một module parser cho một sender/template cụ thể (theo .md, bước 14).
 * `extract` chỉ làm extraction — validation nằm ở booking-fields.schema.
 */
export interface TemplateParser {
  readonly templateTag: string;
  canParse(payload: Record<string, unknown>): boolean;
  extract(payload: Record<string, unknown>): BookingFields | null;
}

export type { BookingFields };
