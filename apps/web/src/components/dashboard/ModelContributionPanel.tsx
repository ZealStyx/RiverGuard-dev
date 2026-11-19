"use client";

/**
 * Model attribution from the local inference service.
 *
 * These bars are a real sensitivity sweep: for each input the service moves it
 * to both ends of its plausible range, re-scores the model, and reports how far
 * the flood probability and water level move. Nothing here is hard-coded, and
 * when the sweep cannot run the panel says why instead of showing a plausible
 * looking chart.
 */

import { useCallback, useEffect, useState } from "react";

import { StatusLabel } from "@/components/ui";
import type { ModelContribution } from "@/types";

type LoadState = "loading" | "ready" | "error";

interface ContributionResponse {
  locationCode: string;
  locationName: string;
  modelVersion: string;
  baseProbability: number;
  baseWaterLevelM: number;
  asOfDate: string;
  contributions: Array<{
    key: string;
    label: string;
    deltaProbability: number;
    deltaWaterLevelM: number;
  }>;
  error?: string;
  detail?: string;
}

function shareOf(value: number, largest: number): number {
  if (largest <= 0) return 0;
  return Math.round((Math.abs(value) / largest) * 100);
}

export function ModelContributionPanel({
  locationCode = "marikina",
}: {
  locationCode?: string;
} = {}) {
  const [state, setState] = useState<LoadState>("loading");
  const [rows, setRows] = useState<ModelContribution[]>([]);
  const [header, setHeader] = useState<{
    modelVersion: string;
    baseProbability: number;
    asOfDate: string;
  } | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const requestKey = `${locationCode}|${attempt}`;
  const shownState: LoadState = resolvedKey === requestKey ? state : "loading";

  useEffect(() => {
    let active = true;

    const [requestedLocation] = requestKey.split("|");
    fetch(
      `/api/contributions?locationCode=${encodeURIComponent(requestedLocation)}`,
    )
      .then(async (response) => {
        const payload = (await response.json()) as ContributionResponse;
        if (!response.ok) {
          throw new Error(
            payload.error ?? `Attribution failed (${response.status})`,
          );
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        const largest = payload.contributions.reduce(
          (high, row) => Math.max(high, Math.abs(row.deltaProbability)),
          0,
        );
        setRows(
          payload.contributions.map((row) => {
            const share = shareOf(row.deltaProbability, largest);
            return {
              label: row.label,
              deltaProbability: row.deltaProbability,
              deltaWaterLevelM: row.deltaWaterLevelM,
              share,
              tone: share >= 66 ? "strong" : share >= 33 ? "medium" : "light",
            };
          }),
        );
        setHeader({
          modelVersion: payload.modelVersion,
          baseProbability: payload.baseProbability,
          asOfDate: payload.asOfDate,
        });
        setErrorDetail(null);
        setState("ready");
        setResolvedKey(requestKey);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorDetail(
          error instanceof Error ? error.message : "Attribution unavailable",
        );
        setState("error");
        setResolvedKey(requestKey);
      });

    return () => {
      active = false;
    };
  }, [requestKey]);

  return (
    <section
      id="model-contribution"
      aria-labelledby="model-contribution-title"
      data-dashboard-section
      className="rounded-panel border border-line bg-chart-surface p-4 text-ink"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="model-contribution-title" className="text-section">
            Model contribution
          </h2>
          <p className="text-metadata mt-0.5 text-muted">
            Probability swing when each input is swept across its plausible
            range
          </p>
        </div>
        <StatusLabel className="border-line bg-canvas text-muted">
          {shownState === "ready" && header
            ? `${header.modelVersion} · ${header.asOfDate}`
            : state === "loading"
              ? "Scoring…"
              : "Unavailable"}
        </StatusLabel>
      </div>

      {shownState === "loading" ? (
        <p className="text-metadata mt-3 text-muted">
          Running the sensitivity sweep…
        </p>
      ) : state === "error" ? (
        <div className="mt-3 grid gap-2" role="alert">
          <p className="text-body text-muted">
            The local inference service did not return an attribution.
          </p>
          <p className="text-metadata text-muted">
            {errorDetail ?? "Unknown error."}
          </p>
          <p className="text-metadata text-muted">
            Start it with{" "}
            <code className="rounded bg-canvas px-1 py-0.5">
              uvicorn app.main:app --port 8000
            </code>{" "}
            from{" "}
            <code className="rounded bg-canvas px-1 py-0.5">services/ml</code>.
          </p>
          <button
            type="button"
            onClick={retry}
            className="text-button w-fit rounded-control border border-line bg-canvas px-2.5 py-1.5 hover:bg-canvas-soft"
          >
            Retry
          </button>
        </div>
      ) : (
        <ul className="mt-3 grid gap-2">
          {rows.map((row) => {
            const signed = row.deltaProbability >= 0 ? "+" : "";
            return (
              <li key={row.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-metadata text-ink">{row.label}</span>
                  <span className="text-metadata font-semibold text-ink">
                    {signed}
                    {(row.deltaProbability * 100).toFixed(1)} pp
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-canvas">
                  <div
                    className={`h-2 rounded-full ${
                      row.tone === "strong"
                        ? "bg-brand-primary"
                        : row.tone === "medium"
                          ? "bg-brand-secondary"
                          : "bg-brand-primary-soft"
                    }`}
                    style={{ width: `${Math.max(row.share, 2)}%` }}
                  />
                </div>
                <span className="text-metadata text-muted">
                  water level {row.deltaWaterLevelM >= 0 ? "+" : ""}
                  {row.deltaWaterLevelM.toFixed(3)} m
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {shownState === "ready" && header ? (
        <p className="text-metadata mt-2 text-muted">
          Base probability {(header.baseProbability * 100).toFixed(1)}% · a
          sensitivity sweep, not a causal attribution.
        </p>
      ) : null}
    </section>
  );
}
