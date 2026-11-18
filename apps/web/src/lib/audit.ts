/**
 * The audit trail this prototype can actually keep.
 *
 * The audit screen used to state, correctly, that nothing wrote an audit trail,
 * while still offering filters that filtered nothing. Two things change here:
 * the events that the local service really performs are recorded (a forecast run
 * that stored something, a review decision that was saved), and the filters are
 * resolved by the reader that owns the data.
 *
 * What this is *not*: a compliance audit. There is no authentication, so the
 * actor is the local operator, and the file can be edited by anyone with access
 * to the checkout. The screen says so.
 *
 * Nothing here imports Node APIs: the browser needs these shapes too.
 */

export const AUDIT_ACTION_LABEL = {
  "forecast.run": "Forecast run",
  "review.recorded": "Review recorded",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTION_LABEL;
export type AuditOutcome = "success" | "failure";

export interface AuditEvent {
  eventId: string;
  /** Epoch milliseconds. */
  at: number;
  actor: string;
  action: AuditAction;
  /** What the event was about: a run id, a review id, a location. */
  target: string;
  outcome: AuditOutcome;
  detail: string;
}

/** The actor recorded for every event: there is no sign-in to name. */
export const LOCAL_ACTOR = "Local operator (unauthenticated)";

export interface AuditFilters {
  actor?: string;
  action?: AuditAction | "all";
  outcome?: AuditOutcome | "all";
  /** Inclusive `YYYY-MM-DD` bounds, interpreted in Asia/Manila. */
  from?: string;
  to?: string;
  limit?: number;
}

export function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === "string" && value in AUDIT_ACTION_LABEL;
}

export function isAuditOutcome(value: unknown): value is AuditOutcome {
  return value === "success" || value === "failure";
}

/**
 * Marks the start of a Manila day as epoch milliseconds.
 *
 * `new Date("2026-11-19")` parses as UTC midnight, which is 08:00 in Manila, so
 * a "from" filter would silently drop the first eight hours of the chosen day.
 * Manila is UTC+8 with no daylight saving, so the offset is fixed.
 */
export function manilaDayStart(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(utcMidnight)) return null;
  return utcMidnight - 8 * 60 * 60 * 1000;
}

export function manilaDayEnd(date: string): number | null {
  const start = manilaDayStart(date);
  return start === null ? null : start + 24 * 60 * 60 * 1000 - 1;
}

export function formatAuditTime(at: number): string {
  return new Date(at).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}
