"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_TOKEN_COOKIE = exports.ACCESS_TOKEN_COOKIE = void 0;
exports.cookieOptions = cookieOptions;
exports.parseDuration = parseDuration;
exports.ACCESS_TOKEN_COOKIE = 'booking_access_token';
exports.REFRESH_TOKEN_COOKIE = 'booking_refresh_token';
function cookieOptions(maxAgeSeconds) {
    const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
    const sameSite = process.env.COOKIE_SAME_SITE;
    return {
        httpOnly: true,
        sameSite: sameSite || (secure ? 'none' : 'lax'),
        secure,
        path: '/',
        ...(maxAgeSeconds > 0 ? { maxAge: maxAgeSeconds * 1000 } : {}),
    };
}
function parseDuration(value, fallback) {
    const v = value || fallback;
    const match = /^(\d+)([smhd])$/.exec(v);
    if (!match)
        return 86400;
    const n = Number(match[1]);
    switch (match[2]) {
        case 's':
            return n;
        case 'm':
            return n * 60;
        case 'h':
            return n * 3600;
        case 'd':
            return n * 86400;
        default:
            return n;
    }
}
//# sourceMappingURL=cookies.js.map