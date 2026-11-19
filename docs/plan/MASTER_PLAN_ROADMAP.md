# MASTER PLAN & ROADMAP — RiverGuard

**Project:** RiverGuard — Explainable Machine Learning for Hydrological Flood Risk and Water-Level Forecasting  
**Source of truth:** Project root [`README.md`](../README.md) — "Development Roadmap" section  
**Status:** Phase 1 partially delivered (development dataset v2); Phase 2 pipeline work unblocked  
**Last updated:** 2026-11-15  
**Owner docs folder:** `docs/plan/`

---

## Purpose

This file is the single source of truth for RiverGuard delivery planning. It summarizes the six delivery phases defined in the root README and points to the detailed per-phase plan files in this folder.

> **Safety reminder:** RiverGuard supports decision-making; it does not issue official evacuation orders or replace local government units (LGUs) and government agencies. No prediction, probability, or warning should be treated as operational or validated until the underlying data and models have been tested for their intended use.

---

## Phase summary

| Phase | Focus | Entry gate | Exit / go-no-go |
|-------|-------|------------|-----------------|
| **Phase 1** | Data Acquisition & Exploration (Critical Path) | Repo + dev accounts available | **In progress** — development dataset delivered; **Conditional Go** for engineering, **No-Go** for operational models. Observed gauge data still outstanding. |
| **Phase 2** | Local ML Prototyping | Phase 1 Go (conditional) | **Unblocked for pipeline work** — baselines may be built, but metrics are pipeline-validation only until real observations replace derived columns |
| **Phase 3** | Application Foundation | Phase 2 complete | Next.js + Convex dashboard with charts and freshness indicators |
| **Phase 4** | API Integration & Simplified Hosting | Phase 3 complete | Forecasts flow from ML service → Convex → dashboard |
| **Phase 5** | Project NOAH Map & Explainability UI | Phase 4 complete | Hazard map + SHAP explanations rendered on dashboard |
| **Phase 6** | Alerts & Operational Validation | Phase 5 complete | Alert rules + acknowledgement workflow validated with stakeholders |

---

## Per-phase plan files

| File | Phase |
|------|-------|
| [`phase-01-data-acquisition-exploration.md`](phase-01-data-acquisition-exploration.md) | Phase 1 — Data Acquisition & Exploration |
| [`phase-02-local-ml-prototyping.md`](phase-02-local-ml-prototyping.md) | Phase 2 — Local ML Prototyping |
| [`phase-03-application-foundation.md`](phase-03-application-foundation.md) | Phase 3 — Application Foundation |
| [`phase-04-api-integration-hosting.md`](phase-04-api-integration-hosting.md) | Phase 4 — API Integration & Simplified Hosting |
| [`phase-05-project-noah-map-explainability.md`](phase-05-project-noah-map-explainability.md) | Phase 5 — Project NOAH Map & Explainability UI |
| [`phase-06-alerts-operational-validation.md`](phase-06-alerts-operational-validation.md) | Phase 6 — Alerts & Operational Validation |

---

## Dataset status (2026-11-15)

| Item | Value |
|---|---|
| File | `data/RiverGuard_NCR_Dataset_v2.xlsx` (+ `data/*.csv`, `data/dataset_preview.html`) |
| Coverage | 2016-01-01 → 2026-11-14 · 3,971 days × 4 cities (QC, Marikina, Manila, Pasig) = **15,884 rows** |
| Rainfall | Synthetic calibrated to PAGASA 1991–2020 normals before 2025-11-15; **real ERA5 reanalysis** for the last 365 days |
| Water level / soil moisture | **Derived** from rainfall — not observations |
| Flood label | **Rule-based proxy** over PAGASA thresholds and river alarm levels — not official events |
| Splits | train 2016–2023 (11,688) / validation 2024 (1,464) / test 2025–2026 (2,732) |
| Catalogue | [`docs/data-sources.md`](../data-sources.md) · [`data/README.md`](../../data/README.md) |

This dataset satisfies the *engineering* need (schema, ingest, features, API, UI, CI). It does
**not** satisfy Phase 1's observational exit criteria, and no model trained on it may be
described as validated for NCR flood prediction. See the Phase 1 Go/No-Go record.

---

## Cross-cutting rules (all phases)

- **Sequencing:** Do not start a phase until the previous phase's exit criteria are met and its go/no-go decision is recorded.
- **No large binaries:** Do not commit datasets, PMTiles archives, secrets, or large model binaries to Git without an explicit reason and approved storage strategy. *Current exception (approved):* the ~6 MB development dataset in `data/` is committed so the pipeline and preview are reproducible offline; revisit if it grows.
- **Documentation:** When architecture or data contracts change, update the relevant documentation under `docs/` (see root README [Contributing](../README.md#contributing)).
- **Mock data labeling:** Clearly label mock data and illustrative predictions so they cannot be mistaken for observations or validated forecasts.
- **Safety:** Static Project NOAH hazard maps are not forecasts; return periods are not schedules; ML explainability is not causality; model output is decision support, not an official warning.

## AWS credit constraint

The project has a limited **US$130 AWS credit balance**. Before creating AWS services, verify the credit balance, expiration date, and eligible services in the AWS Billing console. Configure AWS Budgets alerts (e.g. 50% / 80% / 100%) before repeated deployment or load testing. Budget alerts are notifications, not hard spending caps.

---

## Decision log

| # | Decision | Phase | Status |
|---|----------|-------|--------|
| D1 | Proceed from Phase 1 to Phase 2 (Go/No-Go on dataset) | 1 | **Recorded 2026-11-15 — Conditional Go.** Engineering unblocked with dataset v2; operational Model A and calibrated Model B remain **No-Go** until real gauge + LGU event data are acquired. |
| D5 | Commit the ~6 MB development dataset to Git | 1 | **Accepted 2026-11-15** — reproducibility beats repository slimness at this size; move to external storage if it grows or real agency data lands |
| D2 | PaaS vs AWS Lambda for ML hosting | 4 | Pending |
| D3 | Remote Project NOAH PMTiles vs mirrored storage | 5 | Pending (default: remote) |
| D4 | Stakeholder validation of warning workflows | 6 | Pending |

---

**Related docs:** [`docs/architecture/riverguard-architecture.md`](../architecture/riverguard-architecture.md), [`docs/README.md`](../README.md), root [`README.md`](../README.md).
