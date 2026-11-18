"use client";

/**
 * Reads the prototype's own API routes as data.
 *
 * Reviews, audit events and system status are all "GET a JSON document from
 * this app". One keyed fetcher serves all three: the key is the URL, so changing
 * a filter reads as "loading" without resetting state inside the effect, and a
 * failed request is data the screen can render rather than a thrown error.
 */

import { useEffect, useState } from "react";

import type { AuditEvent, AuditFilters } from "./audit";
import type { RunReview } from "./reviews";
import type { SystemStatus } from "./system";

export interface ServerValue<T> {
  /** `undefined` until the first response for this URL lands. */
  data: T | undefined;
  error: Error | null;
}

interface Keyed<T> {
  key: string;
  data: T | undefined;
  error: Error | null;
}

const EMPTY = { data: undefined, error: null } as const;

export function useServerValue<T>(url: string | null): ServerValue<T> {
  const [result, setResult] = useState<Keyed<T>>({
    key: "",
    data: undefined,
    error: null,
  });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as T & {
          error?: string;
          detail?: string;
        };
        if (!response.ok) {
          throw new Error(
            [payload.error, payload.detail].filter(Boolean).join(" — ") ||
              `Request failed (${response.status})`,
          );
        }
        setResult({ key: url, data: payload, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          key: url,
          data: undefined,
          error: error instanceof Error ? error : new Error("unknown error"),
        });
      }
    })();

    return () => controller.abort();
  }, [url]);

  return result.key === url
    ? { data: result.data, error: result.error }
    : EMPTY;
}

/** Recorded LGU decisions, newest first. */
export function useReviews(limit = 100): ServerValue<{ reviews: RunReview[] }> {
  return useServerValue(`/api/reviews?limit=${limit}`);
}

export function useReviewsForRun(
  runId: string | null,
): ServerValue<{ reviews: RunReview[] }> {
  return useServerValue(
    runId ? `/api/reviews?runId=${encodeURIComponent(runId)}` : null,
  );
}

/** Audit events, filtered by the server. */
export function useAuditEvents(
  filters: AuditFilters,
): ServerValue<{ events: AuditEvent[] }> {
  const params = new URLSearchParams();
  if (filters.actor?.trim()) params.set("actor", filters.actor.trim());
  if (filters.action && filters.action !== "all")
    params.set("action", filters.action);
  if (filters.outcome && filters.outcome !== "all")
    params.set("outcome", filters.outcome);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("limit", String(filters.limit ?? 100));
  return useServerValue(`/api/audit?${params.toString()}`);
}

export function useSystemStatus(): ServerValue<SystemStatus> {
  return useServerValue("/api/system");
}
