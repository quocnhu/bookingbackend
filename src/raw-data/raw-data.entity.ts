// RawData lifecycle states (per the .md): pending → parsed | unparsed | parse_failed.
// `status` is the PROCESSING lifecycle and doubles as the replay guard
// (the parsing worker skips a row whose status is already 'parsed').
export const RAW_DATA_STATUS = {
  PENDING: 'pending',
  PARSED: 'parsed',
  UNPARSED: 'unparsed',
  PARSE_FAILED: 'parse_failed',
} as const;

export type RawDataStatus =
  (typeof RAW_DATA_STATUS)[keyof typeof RAW_DATA_STATUS];

/**
 * What the EMAIL is — independent of the processing lifecycle.
 *
 *  - CREATE — a new booking, or a re-sent confirmation of a known one
 *  - MODIFY — an amendment: the same reference with different details
 *  - CANCEL — the booking was cancelled
 *  - DUPLICATE — a duplicate/re-sent mail that was blocked (no change)
 */
export const RAW_DATA_ACTION = {
  CREATE: 'CREATE',
  MODIFY: 'MODIFY',
  CANCEL: 'CANCEL',
  DUPLICATE: 'DUPLICATE',
} as const;

export type RawDataAction =
  (typeof RAW_DATA_ACTION)[keyof typeof RAW_DATA_ACTION];

/**
 * What the SYSTEM did with the email.
 *
 *  - CREATED   — the email produced a new booking
 *  - UPDATED   — the email changed an existing booking
 *  - CANCELLED — the email cancelled an existing booking
 *  - UNCHANGED — the email was about a known booking but changed nothing
 *  - SKIPPED   — the email was ignored (stale, or the booking was already cancelled)
 */
export const RAW_DATA_OUTCOME = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  CANCELLED: 'CANCELLED',
  UNCHANGED: 'UNCHANGED',
  SKIPPED: 'SKIPPED',
} as const;

export type RawDataOutcome =
  (typeof RAW_DATA_OUTCOME)[keyof typeof RAW_DATA_OUTCOME];

export interface RawDataEntity {
  id: string;
  sourceId: string;
  payload: Record<string, unknown>;
  status: RawDataStatus;
  /** What the email is: CREATE | MODIFY | CANCEL. */
  action?: RawDataAction | null;
  /** What the system did: CREATED | UPDATED | CANCELLED | UNCHANGED | SKIPPED. */
  outcome?: RawDataOutcome | null;
  payloadHash?: string | null;
  email?: string | null;
  templateTag?: string | null;
  bookingId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
