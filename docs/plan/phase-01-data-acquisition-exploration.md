# Phase 1 — Data Acquisition & Exploration (Critical Path)

**Project:** RiverGuard  
**Folder:** `docs/plan/phase-01-data-acquisition-exploration.md`  
**Status:** Planned  
**Dependencies:** None (first phase; repository and dev accounts must be available)

---

## Objective

Secure a working, clean historical dataset spanning multiple years **before any web development or model work proceeds**. This phase is the critical path: without reliable timestamped rainfall and river-level observations, forecasting cannot be trained or validated.

---

## Entry criteria

- Repository access configured.
- Development accounts available as needed (GitHub, Convex, Vercel, AWS).
- Clean dataset location identified (local working copy; nothing committed to Git).

---

## Key tasks

| # | Task | Details |
|---|------|---------|
| T1 | Secure historical rainfall and river-level CSV data | Sources to evaluate: DOST-ASTI PhilSensors, PAGASA, or other hydrological data providers. Target at least one pilot station with multi-year coverage. |
| T2 | Document source licensing, coverage, measurement units, and update frequency | For every data source: license/ODbL or other terms, geographic coverage, temporal resolution, units (e.g. mm for rainfall, m for water level), timezone convention, and how often data is updated. |
| T3 | Clean the dataset locally | Handle missing data, NaNs, and timezone alignment. Do **not** silently replace missing measurements with zero. Preserve missing, stale, invalid, and estimated values as distinguishable states. |
| T4 | Record data provenance, transformations, and quality status | Document where each file came from, when it was acquired, what cleaning was applied, and any known quality gaps. Store this in `docs/reference/` or `docs/data-sources.md`. |
| T5 | Identify candidate stations, forecast horizons, and threshold references | Select pilot station(s). Define candidate forecast horizons (e.g. 6h, 12h, 24h) based on observation frequency. Identify locally documented water-level thresholds for flood-risk estimation. |

---

## Exit criteria

- A clean, multi-year dataset is available locally for at least one pilot station.
- Source licensing, coverage, units, and update frequency are documented.
- **Go/No-Go decision recorded:** Do not proceed to web development (Phase 2) until this decision is recorded as **"Go"**.

If the decision is **No-Go**, stop and reassess data sources before spending effort on application or ML work.

---

## Risks

- Data availability, access permissions, geographic coverage, or quality may not support forecasting. Confirm before depending on any source.
- Timezone mismatches between sources can corrupt feature engineering; align all timestamps to a single convention (document it).
- Missing-data handling errors (e.g. zero-filling) can produce silently wrong model inputs; keep missingness explicit.

---

## Deliverables

| Deliverable | Location |
|-------------|----------|
| Cleaned dataset (local, not committed to Git) | `data/samples/` (small fixtures only) or local working copy |
| Data source documentation | `docs/reference/` or `docs/data-sources.md` |
| Go/No-Go decision record | `docs/issues/` or this phase file |

---

## Related

- Root README: [Data Requirements](../README.md#data-requirements), [Development Roadmap — Phase 1](../README.md#phase-1--data-acquisition--exploration-critical-path)
- `docs/plan/MASTER_PLAN_ROADMAP.md`
- `docs/architecture/riverguard-architecture.md`
