export const PICKUP_REMINDER_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const DEFAULT_PICKUP_REMINDER_TIME = '06:00';
/** Always remind before pickup: configured time, but at most 1h before pickup. */
export const PICKUP_REMINDER_LEAD_MINUTES = 60;

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHhmm(value?: string | null): boolean {
  return HHMM_PATTERN.test((value ?? '').trim());
}

export function hhmmToMinutes(value?: string | null): number | null {
  const clean = (value ?? '').trim();
  if (!HHMM_PATTERN.test(clean)) return null;
  const [h, m] = clean.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHhmm(minutes: number): string {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** YYYY-MM-DD in Ho Chi Minh time (en-CA gives ISO-like keys). */
export function hcmDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PICKUP_REMINDER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Minutes since midnight in Ho Chi Minh time. */
export function hcmTimeMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PICKUP_REMINDER_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export function bookingPickupMinutes(
  departureTime?: string | null,
  tourDepartureTimes?: string[] | null,
): number | null {
  return (
    hhmmToMinutes(departureTime) ??
    hhmmToMinutes(tourDepartureTimes?.[0] ?? null)
  );
}

/**
 * The configured 06:00 reminder is pulled earlier for early departures so the
 * mail always arrives before pickup (never later than `lead` minutes before).
 */
export function effectiveReminderMinutes(
  configuredMinutes: number,
  earliestPickupMinutes: number | null,
  leadMinutes: number = PICKUP_REMINDER_LEAD_MINUTES,
): number {
  if (earliestPickupMinutes == null) return configuredMinutes;
  return Math.max(
    0,
    Math.min(configuredMinutes, earliestPickupMinutes - leadMinutes),
  );
}

/**
 * Should the cron send the reminder now?
 * - never after the pickup time (the trip already started);
 * - only once the effective reminder time has been reached.
 */
export function shouldSendReminderNow(input: {
  nowMinutes: number;
  configuredMinutes: number;
  earliestPickupMinutes: number | null;
}): boolean {
  if (
    input.earliestPickupMinutes != null &&
    input.nowMinutes >= input.earliestPickupMinutes
  ) {
    return false;
  }
  return (
    input.nowMinutes >=
    effectiveReminderMinutes(
      input.configuredMinutes,
      input.earliestPickupMinutes,
    )
  );
}
