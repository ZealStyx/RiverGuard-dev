/**
 * Where a run went, in words.
 *
 * The API already answers this precisely — `POST /api/forecast` returns
 * `persistence: { kind: "convex" | "local" | "none", stored, error? }` — but the
 * screens used to infer it from `snapshot.source`, which is `"live"` for any run
 * that was just executed. A run Convex stored perfectly still announced "Convex
 * is not configured", because a live run is never `"convex"`.
 *
 * So the wording is derived here, from the recorded outcome, once, and every
 * screen renders the same three states: stored in Convex, stored locally,
 * refused. Configuration is only mentioned when it is the actual cause.
 */

export type PersistenceKind = "convex" | "local" | "none";

export interface RunPersistence {
  kind: PersistenceKind;
  stored: boolean;
  /** Why the write failed, already phrased for a reader by the server. */
  error?: string;
}

export interface PersistenceLine {
  text: string;
  /** `warning` when the run was not stored where it was meant to be. */
  tone: "neutral" | "warning";
}

/**
 * The storage sentence for a run block.
 *
 * `restored` means the numbers on screen came from Convex rather than from a
 * run this tab performed, which is a different statement from "the run was
 * stored" — a reader needs to know the forecast is not fresh.
 */
export function describePersistence(
  persistence: RunPersistence | null | undefined,
  options: { restored?: boolean } = {},
): PersistenceLine {
  if (options.restored) {
    return {
      tone: "neutral",
      text: "Restored from Convex. These are the stored numbers, not a new forecast.",
    };
  }

  if (!persistence) {
    return {
      tone: "neutral",
      text: "This build did not report where the run was stored.",
    };
  }

  if (persistence.kind === "convex") {
    return persistence.stored
      ? {
          tone: "neutral",
          text: "Stored in Convex. Reloading this page restores this run instead of running the model again.",
        }
      : {
          tone: "warning",
          text: "Convex is configured, but the write failed — this run exists only in this tab. The warning above has the error; run npm run convex:dev to push the current functions, then run the forecast again.",
        };
  }

  if (persistence.kind === "local") {
    return {
      tone: "neutral",
      text: "Stored on this machine only, in .data/runs.json. Set NEXT_PUBLIC_CONVEX_URL and restart the dev server to keep runs in Convex instead.",
    };
  }

  return {
    tone: "warning",
    text: "This run was not stored anywhere — the warning above says why.",
  };
}

/** The same state in four words, for a one-line status bar. */
export function describeStorageShort(
  persistence: RunPersistence | null | undefined,
): string | null {
  if (!persistence) return null;
  if (persistence.kind === "convex") {
    return persistence.stored ? "stored in Convex" : "not stored: Convex error";
  }
  if (persistence.kind === "local") return "stored on this machine only";
  return "not stored";
}
