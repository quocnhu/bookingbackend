// RawData lifecycle states (per the .md): pending → parsed | unparsed | parse_failed.
export const RAW_DATA_STATUS = {
  PENDING: 'pending',
  PARSED: 'parsed',
  UNPARSED: 'unparsed',
  PARSE_FAILED: 'parse_failed',
} as const;

export type RawDataStatus =
  (typeof RAW_DATA_STATUS)[keyof typeof RAW_DATA_STATUS];

export interface RawDataEntity {
  id: string;
  sourceId: string;
  payload: Record<string, unknown>;
  status: RawDataStatus;
  payloadHash?: string | null;
  email?: string | null;
  templateTag?: string | null;
  bookingId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
