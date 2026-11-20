"use client";

/**
 * Reads the local run store through `/api/runs`.
 *
 * Only used when no Convex deployment is configured — the run screens read
 * `forecasts:recentRuns` / `forecasts:getRun` otherwise, because a Convex
 * subscription updates itself and does not need polling.
 *
 * State is keyed by request so a changed `runId` reads as "loading" without
 * resetting state inside the effect (which would cascade renders).
 */

import { useEffect, useState } from "react";

import type { StoredRun, StoredRunSummary } from "./runs";

export interface LocalRunsState<T> {
  /** `undefined` until the first response for this key lands. */
  data: T | undefined;
  error: Error | null;
}

interface Keyed<T> {
  key: string;
  data: T | undefined;
  error: Error | null;
}

const EMPTY = { data: undefined, error: null } as const;

export function useLocalRuns(limit = 25): LocalRunsState<StoredRunSummary[]> {
  const key = String(limit);
  const [result, setResult] = useState<Keyed<StoredRunSummary[]>>({
    key: "",
    data: undefined,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(`/api/runs?limit=${limit}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          runs?: StoredRunSummary[];
          error?: string;
          detail?: string;
        };
        if (!response.ok) {
          throw new Error(
            [payload.error, payload.detail].filter(Boolean).join(" — ") ||
              `Request failed (${response.status})`,
          );
        }
        setResult({
          key: String(limit),
          data: payload.runs ?? [],
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          key: String(limit),
          data: undefined,
          error: error instanceof Error ? error : new Error("unknown error"),
        });
      }
    })();

    return () => controller.abort();
  }, [limit]);

  return result.key === key
    ? { data: result.data, error: result.error }
    : EMPTY;
}

export function useLocalRun(runId: string): LocalRunsState<StoredRun | null> {
  const [result, setResult] = useState<Keyed<StoredRun | null>>({
    key: "",
    data: undefined,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 404) {
          // A real answer: the store has no run with this id.
          setResult({ key: runId, data: null, error: null });
          return;
        }
        const payload = (await response.json()) as {
          run?: StoredRun;
          error?: string;
          detail?: string;
        };
        if (!response.ok) {
          throw new Error(
            [payload.error, payload.detail].filter(Boolean).join(" — ") ||
              `Request failed (${response.status})`,
          );
        }
        setResult({ key: runId, data: payload.run ?? null, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          key: runId,
          data: undefined,
          error: error instanceof Error ? error : new Error("unknown error"),
        });
      }
    })();

    return () => controller.abort();
  }, [runId]);

  return result.key === runId
    ? { data: result.data, error: result.error }
    : EMPTY;
}
