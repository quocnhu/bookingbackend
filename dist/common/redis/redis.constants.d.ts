export declare const REDIS_CLIENT = "REDIS_CLIENT";
export declare const REDIS_SUBSCRIBER = "REDIS_SUBSCRIBER";
export declare const DEDUP_TTL_SECONDS: number;
export declare const dedupKey: (messageId: string) => string;
export declare const historyCheckpointKey: (email: string) => string;
