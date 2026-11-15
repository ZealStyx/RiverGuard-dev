import { ArrowSquareOut } from "@phosphor-icons/react";
import Link from "next/link";

import { provenanceRows } from "@/data/dashboard";

export function StationDetails() {
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
        <Link
          href="/researcher/data-sources/daily-rainfall"
          className="text-button inline-flex min-h-7 items-center justify-center gap-1.5 rounded-control border border-line px-2.5 hover:bg-canvas-soft"
        >
          Open full evidence
          <ArrowSquareOut aria-hidden="true" size={14} />
        </Link>
      </div>
      <dl className="mt-3 grid grid-cols-[78px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
        {provenanceRows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-metadata text-muted">{label}</dt>
            <dd className="text-metadata text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
