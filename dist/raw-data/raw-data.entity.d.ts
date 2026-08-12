export declare const RAW_DATA_STATUS: {
    readonly PENDING: "pending";
    readonly PARSED: "parsed";
    readonly UNPARSED: "unparsed";
    readonly PARSE_FAILED: "parse_failed";
};
export type RawDataStatus = (typeof RAW_DATA_STATUS)[keyof typeof RAW_DATA_STATUS];
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
