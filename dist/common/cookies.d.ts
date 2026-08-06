export declare const ACCESS_TOKEN_COOKIE = "booking_access_token";
export declare const REFRESH_TOKEN_COOKIE = "booking_refresh_token";
export interface CookieOptions {
    httpOnly: boolean;
    sameSite: 'lax' | 'none' | 'strict';
    secure: boolean;
    path: string;
}
export declare function cookieOptions(maxAgeSeconds: number): CookieOptions;
export declare function parseDuration(value: string | undefined, fallback: string): number;
