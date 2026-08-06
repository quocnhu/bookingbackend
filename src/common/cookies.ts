export const ACCESS_TOKEN_COOKIE = 'booking_access_token';
export const REFRESH_TOKEN_COOKIE = 'booking_refresh_token';

export interface CookieOptions {
  httpOnly: boolean;
  sameSite: 'lax' | 'none' | 'strict';
  secure: boolean;
  path: string;
}

export function cookieOptions(maxAgeSeconds: number): CookieOptions {
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAME_SITE as CookieOptions['sameSite'] | undefined;
  return {
    httpOnly: true,
    sameSite: sameSite || (secure ? 'none' : 'lax'),
    secure,
    path: '/',
    ...(maxAgeSeconds > 0 ? { maxAge: maxAgeSeconds * 1000 } : {}),
  };
}

export function parseDuration(value: string | undefined, fallback: string): number {
  const v = value || fallback;
  const match = /^(\d+)([smhd])$/.exec(v);
  if (!match) return 86400;
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
