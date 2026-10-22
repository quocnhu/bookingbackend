export declare const RAW_DATA_STATUS: {
    readonly PENDING: "pending";
    readonly PARSED: "parsed";
    readonly UNPARSED: "unparsed";
    readonly PARSE_FAILED: "parse_failed";
};
export type RawDataStatus = (typeof RAW_DATA_STATUS)[keyof typeof RAW_DATA_STATUS];
export declare const RAW_DATA_ACTION: {
    readonly CREATE: "CREATE";
    readonly MODIFY: "MODIFY";
    readonly CANCEL: "CANCEL";
};
export type RawDataAction = (typeof RAW_DATA_ACTION)[keyof typeof RAW_DATA_ACTION];
export declare const RAW_DATA_OUTCOME: {
    readonly CREATED: "CREATED";
    readonly UPDATED: "UPDATED";
    readonly CANCELLED: "CANCELLED";
    readonly UNCHANGED: "UNCHANGED";
    readonly SKIPPED: "SKIPPED";
};
export type RawDataOutcome = (typeof RAW_DATA_OUTCOME)[keyof typeof RAW_DATA_OUTCOME];
export interface RawDataEntity {
    id: string;
    sourceId: string;
    payload: Record<string, unknown>;
    status: RawDataStatus;
    action?: RawDataAction | null;
    outcome?: RawDataOutcome | null;
    payloadHash?: string | null;
    email?: string | null;
    templateTag?: string | null;
    bookingId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
