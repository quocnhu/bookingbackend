export declare const CANCEL_WINDOW_HOURS = 24;
export declare const CANCEL_WINDOW_MS: number;
export declare function cancelDeadline(startingDate?: Date | null, hours?: number): Date | null;
export declare function isPastCancelWindow(startingDate?: Date | null, hours?: number): boolean;
