"use client";

/**
 * Provenance for the dataset and model the app is actually using.
 *
 * Every row is derived: dataset identity and coverage from a server render of
 * `data/daily_observations.csv`, and the model version from the last ML response
 * the page received. The panel previously listed a fixed "Retrieved Wed, Nov 11,
 * 2026 · 09:40 AM" stamp that no code ever produced.
 */

import { ArrowSquareOut } from "@phosphor-icons/react";
import Link from "next/link";

import { StatusLabel } from "@/components/ui";
import { useDatasetMeta } from "@/lib/use-dataset-meta";
import type { DatasetMeta } from "@/types";

export interface ProvenanceModel {
  version: string | null;
  operatingThreshold?: number | null;
  alarmsVerified?: boolean;
}

export function StationDetails({
  dataset: datasetProp,
  model,
}: {
  /** Omit to read `GET /api/dataset` for this render. */
  dataset?: DatasetMeta;
  model?: ProvenanceModel;
}) {
  const live = useDatasetMeta();
  const dataset = datasetProp ?? live.dataset;

  if (!dataset) {
    return (
      <section
        id="data-provenance"
        aria-labelledby="provenance-title"
        data-dashboard-section
        className="rounded-panel border border-line bg-chart-surface p-4 text-ink"
      >
        <h2 id="provenance-title" className="text-section">
          Data provenance &amp; model information
        </h2>
        <p className="text-metadata mt-3 text-warning" role="status">
          {live.loading
            ? "Reading dataset provenance…"
            : `Dataset provenance unavailable: ${live.error ?? "unknown error"}`}
        </p>
      </section>
    );
  }

  const rows: Array<[string, string]> = [
    ["Source", `${dataset.label} · ${dataset.file}`],
    [
      "Rainfall",
      dataset.realRainFrom
        ? `ERA5 reanalysis from ${dataset.realRainFrom}; synthetic-calibrated before that`
        : "Synthetic-calibrated throughout (no ERA5 segment found)",
    ],
    [
      "Water level",
      "Derived proxy from rainfall and antecedent wetness — not a gauge observation",
    ],
    [
      "Coverage",
      `${dataset.rows.toLocaleString()} city-days · ${dataset.dateMin} → ${dataset.dateMax} · ${dataset.locations.length} cities`,
    ],
    [
      "Model",
      model?.version
        ? `${model.version} (experimental)${
            model.operatingThreshold !== undefined &&
            model.operatingThreshold !== null
              ? ` · operating threshold ${model.operatingThreshold.toFixed(4)}`
              : ""
          }`
        : "No run in this session — open Forecast and run it to populate",
    ],
    [
      "Limitations",
      "City-level only; coarse resolution; experimental model; not for decision-making.",
    ],
  ];

  return (
    <section
      id="data-provenance"
      aria-labelledby="provenance-title"
      data-dashboard-section
      className="rounded-panel border border-line bg-chart-surface p-4 text-ink"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="provenance-title" className="text-section">
          Data provenance &amp; model information
        </h2>
        <div className="flex items-center gap-2">
          <StatusLabel className="border-line bg-canvas text-muted">
            Research use only
          </StatusLabel>
          <Link
            href="/admin/data-sources/daily-rainfall?view=research"
            className="text-button inline-flex min-h-7 items-center justify-center gap-1.5 rounded-control border border-line px-2.5 hover:bg-canvas-soft"
          >
            Open full evidence
            <ArrowSquareOut aria-hidden="true" size={14} />
          </Link>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-[78px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-metadata text-muted">{label}</dt>
            <dd className="text-metadata text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
