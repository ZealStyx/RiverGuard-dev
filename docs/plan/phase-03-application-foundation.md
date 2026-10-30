# Phase 3 — Application Foundation

**Project:** RiverGuard  
**Folder:** `docs/plan/phase-03-application-foundation.md`  
**Status:** Planned  
**Dependencies:** Phase 2 complete (baseline models + evaluation documented)

---

## Objective

Initialize the web application and Convex backend, and ingest cleaned observations into Convex so the dashboard can display historical charts and data-freshness indicators.

---

## Entry criteria

- Phase 2 exit criteria met.
- Trained baseline model artifacts and feature schemas available locally.

---

## Key tasks

| # | Task | Details |
|---|------|---------|
| T1 | Initialize Next.js + TypeScript application | Scaffold `apps/web/` with App Router, Tailwind CSS, shadcn/ui, Recharts, MapLibre GL JS. |
| T2 | Configure Convex and implement initial schema | Tables: users/roles, LGU profiles, monitoring-station metadata, sensor readings, forecasts, risk assessments, alerts, hazard-layer metadata, model-version metadata. |
| T3 | Create indexes for real access patterns | Compound index on `sensor_readings` by `stationId` + `timestamp` for bounded time-window queries. Use pagination; never load an entire station history in one query. |
| T4 | Ingest cleaned CSV observations into Convex | Preserve units, source timestamps, ingestion timestamps, and quality flags. No silent zero-filling. |
| T5 | Build initial dashboard layout | Station overview, historical water-level and rainfall charts (Recharts), data-freshness indicators, search/filter by station/river/municipality/barangay when metadata is available. |

---

## Exit criteria

- Next.js app runs locally (`npm run dev`) and connects to Convex.
- Station metadata and readings queryable in Convex with bounded indexes.
- Initial dashboard loads historical charts and freshness indicators.

---

## Risks

- Unbounded reads of full station histories causing performance/cost issues; enforce pagination and bounded queries.
- Missing/poorly located sensors producing unreliable outputs; preserve quality/status metadata.

---

## Deliverables

| Deliverable | Location |
|-------------|----------|
| Next.js application scaffold | `apps/web/` |
| Convex schema | `convex/` |
| Convex indexes (station + timestamp) | `convex/` |
| Ingested observations | Convex (dev deployment) |
| Initial dashboard | `apps/web/src/` |

---

## Related

- Root README: [Repository Structure](../README.md#repository-structure), [Database Strategy](../README.md#database-strategy), [Development Setup](../README.md#development-setup), [Development Roadmap — Phase 3](../README.md#phase-3--application-foundation)
- `docs/plan/MASTER_PLAN_ROADMAP.md`
- `docs/architecture/riverguard-architecture.md` (Sections 4, 8)
