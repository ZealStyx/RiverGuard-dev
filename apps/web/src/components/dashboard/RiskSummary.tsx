"use client";

/**
 * The seven-day outlook panel.
 *
 * Every value here is passed in from a completed run or from the weather
 * provider's window. There is no built-in week: when there is nothing to show,
 * the panel says so rather than rendering an illustrative set of categories.
 */

import Link from "next/link";

import { StatusLabel } from "@/components/ui";
import { DEFAULT_LOCATION, LOCATIONS } from "@/lib/locations";
import { useOutlookFeed, type OutlookSource } from "@/lib/outlook";
import type { OutlookDay } from "@/types";

export interface RiskSummaryProps {
  selectedDay: number;
  onDayChange: (index: number) => void;
  /** City to run the feed for when no data is passed in. */
  locationCode?: string;
  locationName?: string;
  /** Days from a real run. Omit to use the live feed for `locationCode`. */
  days?: OutlookDay[];
  source?: OutlookSource | "none";
  /** One-line provenance, e.g. provider and model version. */
  note?: string;
  /** True when the rainfall driving these days is not a live forecast. */
  degraded?: boolean;
  /** Shown when there is no run, so the panel can offer the next action. */
  emptyAction?: { href: string; label: string };
}

function toneForLabel(label: OutlookDay["label"]): string {
  if (label === "Elevated") return "text-warning";
  if (label === "Moderate") return "text-brand-secondary";
  return "text-muted";
}

export function RiskSummary({
  selectedDay,
  onDayChange,
  locationCode = DEFAULT_LOCATION,
  locationName,
  days: daysProp,
  source: sourceProp,
  note: noteProp,
  degraded: degradedProp,
  emptyAction,
}: RiskSummaryProps) {
  // Always subscribed, never auto-running: a screen that has no run yet costs
  // nothing until someone presses the button.
  const feed = useOutlookFeed(locationCode);
  const snapshot = feed.snapshot;

  const days = daysProp ?? snapshot?.days ?? [];
  const source = sourceProp ?? snapshot?.source ?? "none";
  const resolvedName =
    locationName ??
    snapshot?.locationName ??
    LOCATIONS[locationCode as keyof typeof LOCATIONS]?.name ??
    locationCode;
  const note =
    noteProp ??
    (snapshot?.degraded ? "Rain inputs are not a live forecast." : undefined);
  const degraded = degradedProp ?? snapshot?.degraded ?? false;
  const hasDays = days.length > 0;
  const activeIndex = hasDays ? Math.min(selectedDay, days.length - 1) : 0;
  const activeDay = hasDays ? days[activeIndex] : null;

  const monthYear = activeDay
    ? new Date(`${activeDay.isoDate}T00:00:00+08:00`).toLocaleDateString(
        "en-PH",
        { month: "long", year: "numeric", timeZone: "Asia/Manila" },
      )
    : null;

  const sourceLabel =
    source === "live"
      ? "Experimental · just run"
      : source === "convex"
        ? "Experimental · stored run"
        : "No run yet";

  return (
    <section
      aria-labelledby="risk-summary-title"
      className="rounded-panel border border-line bg-chart-surface p-4 text-ink"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="risk-summary-title" className="text-major-status">
            {resolvedName}
          </h2>
          <p className="text-body mt-0.5 text-muted">
            {activeDay && monthYear
              ? `${activeDay.day}, ${monthYear.split(" ")[0]} ${activeDay.date}, ${monthYear.split(" ")[1]}`
              : "No forecast run has been completed"}
          </p>
        </div>
        <StatusLabel className="border-line bg-canvas text-muted">
          {sourceLabel}
        </StatusLabel>
      </div>

      {!activeDay ? (
        <div className="mt-3 grid gap-2">
          <p className="text-body text-muted">
            This panel shows model output only. Run the forecast to fetch
            weather, score the next seven days with the local model, and store
            the result.
          </p>
          {feed.error ? (
            <p className="text-metadata text-warning">{feed.error}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void feed.run()}
              disabled={feed.isRunning}
              className="text-button inline-flex w-fit items-center rounded-control bg-brand-primary px-3 py-2 text-white hover:bg-brand-primary-hover disabled:opacity-60"
            >
              {feed.isRunning ? "Running forecast…" : "Run forecast"}
            </button>
            {emptyAction ? (
              <Link
                href={emptyAction.href}
                className="text-metadata text-muted underline-offset-2 hover:underline"
              >
                {emptyAction.label}
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <p
            className={`text-major-status mt-2 ${toneForLabel(activeDay.label)}`}
          >
            {activeDay.label}
            {activeDay.label === "Unavailable"
              ? " model index"
              : " experimental index"}
          </p>
          <p className="text-body mt-1 text-muted">
            Experimental · City-level · Not an official warning
            {activeDay.probability !== undefined
              ? ` · ${(activeDay.probability * 100).toFixed(1)}% flood probability`
              : ""}
            {activeDay.waterLevelM !== undefined
              ? ` · ${activeDay.waterLevelM.toFixed(2)} m predicted`
              : ""}
            {activeDay.rainfallMm !== undefined
              ? ` · ${activeDay.rainfallMm.toFixed(1)} mm rain`
              : ""}
          </p>
          {activeDay.alertLevel && activeDay.alertLevel !== "none" ? (
            <p className="text-metadata mt-1 text-danger">
              Predicted level crosses the {activeDay.alertLevel} alarm.
            </p>
          ) : null}
          {activeDay.reasons?.length ? (
            <ul className="text-metadata mt-1 grid gap-0.5 text-muted">
              {activeDay.reasons.slice(0, 3).map((reason) => (
                <li key={reason}>· {reason}</li>
              ))}
            </ul>
          ) : null}
          {degraded ? (
            <p className="text-metadata mt-1 text-warning">
              Rain inputs are not a live forecast — see the provenance note
              below.
            </p>
          ) : null}
          {note ? (
            <p className="text-metadata mt-1 text-muted">{note}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void feed.run()}
              disabled={feed.isRunning}
              className="text-metadata w-fit rounded-control border border-line px-2 py-1 text-ink hover:bg-canvas-soft disabled:opacity-60"
            >
              {feed.isRunning ? "Refreshing…" : "Run forecast again"}
            </button>
            {snapshot ? (
              <>
                <span className="text-metadata text-muted">
                  model {snapshot.modelVersion ?? "unknown"} ·{" "}
                  {snapshot.provider}
                </span>
              </>
            ) : null}
          </div>

          <div
            className="mt-3 grid grid-cols-7 gap-1"
            aria-label="Seven-day outlook"
          >
            {days.map((day, index) => {
              const active = activeIndex === index;
              return (
                <button
                  key={`${day.day}-${day.isoDate}`}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${day.day}, ${day.isoDate}: ${day.label}${
                    day.probability !== undefined
                      ? `, ${(day.probability * 100).toFixed(0)}% probability`
                      : ""
                  }`}
                  onClick={() => onDayChange(index)}
                  className={`rounded-control border px-1 py-1.5 text-center transition-colors motion-reduce:transition-none ${
                    active
                      ? "border-brand-secondary bg-brand-secondary text-white"
                      : "border-line bg-canvas text-ink hover:bg-brand-secondary-soft"
                  }`}
                >
                  <span className="text-metadata block">{day.day}</span>
                  <span className="text-button mt-0.5 block">{day.date}</span>
                  <span
                    className={`text-metadata mt-1 block font-medium ${
                      active ? "text-white" : toneForLabel(day.label)
                    }`}
                  >
                    {day.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
