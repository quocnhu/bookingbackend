export declare const BOOKING_SYNC_SUBJECT_PREFIX = "[Booking Sync]";
export declare const BOOKING_SYNC_HEADER = "X-Booking-Sync";
export declare const BOOKING_SYNC_HEADER_VALUE = "1";
export declare const BOOKING_SYNC_BODY_MARKER = "was pushed to the Booking table successfully";
export declare const BOOKING_SYNC_DUPLICATE_BODY_MARKER = "was blocked as a duplication and not re-processed";
export declare const DUPLICATE_NOTICE_TTL_SECONDS: number;
export declare const duplicateNoticeKey: (mailbox: string, bookingRef: string) => string;
