/**
 * Cancellation policy.
 *
 * A booking can only be cancelled while the tour is still more than
 * CANCEL_WINDOW_HOURS away. Inside that window the operator is already
 * committed (vehicle, guide, tickets), so the cancellation needs an explicit
 * override by an administrator.
 *
 * The same window is what the OTAs publish: Viator/TripAdvisor state that a
 * booking is amendable "up to 24 hours before the activity" and only within
 * the free-cancellation period of the supplier's terms.
 *
 * A cancellation that arrives BY EMAIL is never blocked — the OTA already
 * cancelled it, refusing to record it would leave a phantom passenger on the
 * bus. The window only governs cancellations requested through our own
 * channels (the dashboard).
 */
export const CANCEL_WINDOW_HOURS = 24;

export const CANCEL_WINDOW_MS = CANCEL_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * The last moment a booking may be cancelled without an override.
 * Returns null when the departure date is unknown — then the window cannot
 * be evaluated and the cancellation is allowed.
 */
export function cancelDeadline(startingDate?: Date | null): Date | null {
  if (!startingDate) return null;
  return new Date(startingDate.getTime() - CANCEL_WINDOW_MS);
}

/**
 * True when the cancellation window for this booking has already closed.
 */
export function isPastCancelWindow(startingDate?: Date | null): boolean {
  const deadline = cancelDeadline(startingDate);
  if (!deadline) return false;
  return Date.now() > deadline.getTime();
}
