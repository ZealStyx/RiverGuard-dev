/**
 * A browser-side nudge: "a forecast just finished, the observed window may have
 * grown".
 *
 * The history chart fetches `/api/historical` when it mounts, and a forecast is
 * started from a different component with its own feed state. Without a signal
 * the panel kept showing the payload it fetched before the run, which reads to a
 * user as "the chart is still stuck on the dataset's last row" even though the
 * days were stored. Any finished run announces itself — success or failure —
 * because a run that failed *after* the weather call still keeps its window.
 *
 * Deliberately tiny: one event name and a safe dispatcher, no state, nothing
 * that runs on the server.
 */

export const OBSERVATIONS_UPDATED_EVENT = "riverguard:observations-updated";

/** Announce that a run finished. No-op outside the browser. */
export function announceObservationsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OBSERVATIONS_UPDATED_EVENT));
}
