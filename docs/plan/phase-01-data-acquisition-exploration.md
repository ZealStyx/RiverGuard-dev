# Phase 1 — Data Acquisition & Exploration (Critical Path)

**Project:** RiverGuard  
**Folder:** `docs/plan/phase-01-data-acquisition-exploration.md`  
**Status:** In progress — a development dataset is delivered; the observational gates are still open  
**Dependencies:** None (first phase; repository and dev accounts must be available)  
**Last updated:** 2026-11-15

---

## Objective

Secure a working, clean historical dataset spanning multiple years **before any web development or model work proceeds**. This phase is the critical path: without reliable timestamped rainfall and river-level observations, forecasting cannot be trained or validated.

---

## Current status (2026-11-15)

A **development dataset** now exists and is committed, so phases downstream can be built and
tested without waiting for agency data. It is an engineering fixture, **not** the observed
dataset this phase's exit criteria require.

| Item | State |
|---|---|
| Coverage | 2016-01-01 → 2026-11-14, 3,971 days × 4 cities (QC, Marikina, Manila, Pasig) = 15,884 rows |
| Rainfall | Synthetic calibrated to PAGASA 1991–2020 normals **before** 2025-11-15; **real ERA5 reanalysis** for the last 365 days |
| Water level / soil moisture | **Derived** from rainfall (bucket + linear reservoir + calibrated datum) — not gauge readings |
| Flood label | **Rule-based proxy** over PAGASA warnings and Marikina 15/16/18 m / Pasig 12/12.5/13 m alarms — not official events |
| Splits | Chronological: train 2016–2023 (11,688 rows), validation 2024 (1,464), test 2025–2026 (2,732) |
| Artifacts | `data/RiverGuard_NCR_Dataset_v2.xlsx`, `data/daily_observations.csv`, `data/monthly_summary.csv`, `data/dataset_preview.html` |
| Catalogue | [`docs/data-sources.md`](../data-sources.md) and [`data/README.md`](../../data/README.md) |

Task status against the table below:

| # | Task | State |
|---|------|-------|
| T1 | Secure historical rainfall and river-level data | **Partial** — ERA5 reanalysis (real, 12 months) + PAGASA normal-calibrated synthetic. No PAGASA/EFCOS gauge series yet. |
| T2 | Document licensing, coverage, units, update frequency | **Done for what exists** — see `docs/data-sources.md` |
| T3 | Clean the dataset locally | **N/A so far** — generated data has no gaps/duplicates; the real task starts with agency files |
| T4 | Record provenance, transformations, quality status | **Done** — `Sources_Provenance`, `Quality_Checks`, `Data_Dictionary` tabs + `data/README.md` |
| T5 | Candidate stations, horizons, threshold references | **Partial** — station list and threshold references recorded; horizons still need stakeholder input |

---

## Go / No-Go record

**Decision date:** 2026-11-15 · **Scope:** development dataset v2 as described above

| Model | Decision | Reasoning |
|---|---|---|
| **Model A** (water level) | **No-Go** for operational/trained forecasting | Required timestamped gauge observations with a documented datum do not exist yet. The dataset's water level is derived from rainfall, which this plan explicitly forbids training a river-level model on. |
| **Model B** (flood occurrence) | **No-Go** for calibrated probabilities; **Conditional Go** for a labelled experimental index | Labels are a documented rule-based proxy, not LGU-verified events. Precision/recall measured against this proxy describe agreement with the rules, not flood prediction skill. |
| **Engineering use (all phases)** | **Go** | Schema, ingest, feature engineering, API wiring, UI states, and CI can all be built against this dataset now. Every surface that shows it must label it as development data. |

**What unblocks a real Go:** PAGASA/EFCOS telemetry at Sto. Niño, Rosario, and Pandacan;
PAGASA AWS rainfall series; LGU-verified flood-event records; then re-run this phase and
replace the affected columns. Until then, model metrics from this data are
pipeline-validation numbers only and must not be reported as NCR flood-prediction performance.

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

| Deliverable | Location | State |
|-------------|----------|-------|
| Development dataset (committed, ~6 MB) | `data/RiverGuard_NCR_Dataset_v2.xlsx`, `data/*.csv` | **Delivered** — generated, labelled, reproducible |
| Dataset generator + preview | `data/generate_dataset.py`, `data/build_preview.py`, `data/dataset_preview.html` | **Delivered** |
| Cleaned *observed* dataset (local, not committed) | Local working copy | **Outstanding** — blocked on agency data access |
| Data source documentation | [`docs/data-sources.md`](../data-sources.md) | **Delivered** (real sources + synthetic method) |
| Go/No-Go decision record | This phase file (above), [`MASTER_PLAN_ROADMAP.md`](MASTER_PLAN_ROADMAP.md) decision log | **Recorded** — Conditional Go for engineering, No-Go for operational models |

---

## Related

- Root README: [Data Requirements](../README.md#data-requirements), [Development Roadmap — Phase 1](../README.md#phase-1--data-acquisition--exploration-critical-path)
- `docs/plan/MASTER_PLAN_ROADMAP.md`
- `docs/architecture/riverguard-architecture.md`
