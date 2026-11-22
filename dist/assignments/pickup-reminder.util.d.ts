export declare const PICKUP_REMINDER_TIME_ZONE = "Asia/Ho_Chi_Minh";
export declare const DEFAULT_PICKUP_REMINDER_TIME = "06:00";
export declare const PICKUP_REMINDER_LEAD_MINUTES = 60;
export declare function isValidHhmm(value?: string | null): boolean;
export declare function hhmmToMinutes(value?: string | null): number | null;
export declare function minutesToHhmm(minutes: number): string;
export declare function hcmDateKey(date: Date): string;
export declare function hcmTimeMinutes(date: Date): number;
export declare function bookingPickupMinutes(departureTime?: string | null, tourDepartureTimes?: string[] | null): number | null;
export declare function effectiveReminderMinutes(configuredMinutes: number, earliestPickupMinutes: number | null, leadMinutes?: number): number;
export declare function shouldSendReminderNow(input: {
    nowMinutes: number;
    configuredMinutes: number;
    earliestPickupMinutes: number | null;
}): boolean;
