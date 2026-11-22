import {
  bookingPickupMinutes,
  effectiveReminderMinutes,
  hcmDateKey,
  hcmTimeMinutes,
  hhmmToMinutes,
  isValidHhmm,
  minutesToHhmm,
  shouldSendReminderNow,
} from './pickup-reminder.util';

describe('pickup-reminder.util', () => {
  it('parses and formats HH:mm values', () => {
    expect(hhmmToMinutes('06:00')).toBe(360);
    expect(hhmmToMinutes('23:59')).toBe(1439);
    expect(hhmmToMinutes('6:00')).toBeNull();
    expect(hhmmToMinutes('24:00')).toBeNull();
    expect(isValidHhmm('06:00')).toBe(true);
    expect(isValidHhmm('06:60')).toBe(false);
    expect(minutesToHhmm(360)).toBe('06:00');
    expect(minutesToHhmm(-5)).toBe('00:00');
    expect(minutesToHhmm(24 * 60 + 10)).toBe('23:59');
  });

  it('reads the booking pickup time with a tour fallback', () => {
    expect(bookingPickupMinutes('08:00', ['13:00'])).toBe(480);
    expect(bookingPickupMinutes(null, ['13:00'])).toBe(780);
    expect(bookingPickupMinutes('bad', ['bad'])).toBeNull();
  });

  it('pulls the send time earlier for early pickups', () => {
    expect(effectiveReminderMinutes(360, 480)).toBe(360);
    expect(effectiveReminderMinutes(360, 300)).toBe(240);
    expect(effectiveReminderMinutes(360, 30)).toBe(0);
    expect(effectiveReminderMinutes(360, null)).toBe(360);
  });

  it('only sends before pickup and after the effective time', () => {
    expect(
      shouldSendReminderNow({
        nowMinutes: 359,
        configuredMinutes: 360,
        earliestPickupMinutes: 480,
      }),
    ).toBe(false);
    expect(
      shouldSendReminderNow({
        nowMinutes: 360,
        configuredMinutes: 360,
        earliestPickupMinutes: 480,
      }),
    ).toBe(true);
    expect(
      shouldSendReminderNow({
        nowMinutes: 360,
        configuredMinutes: 360,
        earliestPickupMinutes: 300,
      }),
    ).toBe(false);
    expect(
      shouldSendReminderNow({
        nowMinutes: 240,
        configuredMinutes: 360,
        earliestPickupMinutes: 300,
      }),
    ).toBe(true);
  });

  it('formats the date and time in HCM', () => {
    const date = new Date('2026-11-22T00:00:00.000Z');
    expect(hcmDateKey(date)).toBe('2026-11-22');
    expect(hcmTimeMinutes(date)).toBe(7 * 60);
    expect(hcmDateKey(new Date('2026-11-21T17:30:00.000Z'))).toBe('2026-11-22');
  });
});
