import {
  CANCEL_WINDOW_HOURS,
  cancelDeadline,
  isPastCancelWindow,
} from './cancellation';

const HOUR = 60 * 60 * 1000;

describe('cancelDeadline', () => {
  it('is the departure date minus the cancellation window', () => {
    const departure = new Date('2026-11-20T08:00:00.000Z');
    expect(cancelDeadline(departure)?.toISOString()).toBe(
      new Date(departure.getTime() - CANCEL_WINDOW_HOURS * HOUR).toISOString(),
    );
  });

  it('is null when the departure date is unknown', () => {
    expect(cancelDeadline(null)).toBeNull();
    expect(cancelDeadline(undefined)).toBeNull();
  });
});

describe('isPastCancelWindow', () => {
  it('is closed inside the window', () => {
    expect(isPastCancelWindow(new Date(Date.now() + 5 * HOUR))).toBe(true);
  });

  it('is still open outside the window', () => {
    expect(isPastCancelWindow(new Date(Date.now() + 48 * HOUR))).toBe(false);
  });

  it('is open when the departure date is unknown', () => {
    expect(isPastCancelWindow(null)).toBe(false);
    expect(isPastCancelWindow(undefined)).toBe(false);
  });
});
