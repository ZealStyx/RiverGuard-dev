# Product Backlog — RiverGuard

Prioritized backlog of epics and user stories. Ordered by value and dependency. This backlog is owned by the Product Owner and refined continuously.

Backlog items map to the six delivery phases in [`docs/plan/MASTER_PLAN_ROADMAP.md`](../plan/MASTER_PLAN_ROADMAP.md).

---

## Phase 1 — Data Acquisition & Exploration (Critical Path)

**Epic: E1.1 Secure and document hydrological data sources**

| ID | Story | Acceptance Criteria | Priority | Estimate |
|----|-------|---------------------|----------|----------|
| US-1.1 | As a data lead, I want to secure historical rainfall and river-level CSV data (e.g., DOST-ASTI PhilSensors, PAGASA) so that we have a multi-year dataset for at least one pilot station. | - CSV data acquired for ≥1 pilot station<br>- Multi-year coverage confirmed<br>- Data stored locally (not committed to Git) | Must | 5 |
| US-1.2 | As a data lead, I want to document source licensing, coverage, measurement units, timezone conventions, and update frequency for every data source. | - Documentation written in `docs/reference/` or `docs/data-sources.md`<br>- License terms (e.g., ODbL) noted<br>- Update frequency captured | Must | 3 |
| US-1.3 | As an ML engineer, I want the dataset cleaned locally (missing data, NaNs, timezone alignment) with missingness preserved as a distinguishable state, so model inputs are trustworthy. | - Cleaning pipeline documented<br>- No silent zero-filling of missing values<br>- Quality/status metadata preserved | Must | 5 |
| US-1.4 | As a product owner, I want a recorded Go/No-Go decision before proceeding to web development, so we do not build on insufficient data. | - Go/No-Go decision recorded in `docs/issues/` or phase-01 file<br>- "Go" required to start Phase 2 | Must | 2 |

**Epic: E1.2 Define stations, horizons, and thresholds**

| ID | Story | Acceptance Criteria | Priority | Estimate |
|----|-------|---------------------|----------|----------|
| US-1.5 | As an ML engineer, I want to identify candidate stations, forecast horizons (e.g., 6h/12h/24h), and locally documented water-level thresholds. | - Station list documented<br>- Horizons based on observation frequency<br>- Threshold sources documented | Should | 3 |

---

## Phase 2 — Local ML Prototyping

**Epic: E2.1 Feature engineering and baseline models**

| ID | Story | Acceptance Criteria | Priority | Estimate |
|----|-------|---------------------|----------|----------|
| US-2.1 | As an ML engineer, I want reproducible feature-engineering pipelines (Pandas/NumPy) so features are consistent across experiments. | - Pipeline in `services/ml/`<br>- Features: lagged levels, rolling rainfall, change over intervals<br>- Missingness tracked | Must | 5 |
| US-2.2 | As an ML engineer, I want to train baseline XGBoost/Scikit-learn regression and classification models compared to persistence baselines. | - Models train reproducibly<br>- Baseline comparison documented | Must | 5 |
| US-2.3 | As an ML engineer, I want to generate local SHAP plots and verify explainability outputs, framed as model contribution not physical causation. | - SHAP plots generated<br>- Causality disclaimer included | Must | 3 |
| US-2.4 | As an ML engineer, I want to evaluate models with chronological/event-based splits and report MAE/RMSE, precision/recall/F1, PR-AUC, calibration/Brier score. | - Time-aware validation used<br>- Metrics documented in `docs/report/` | Must | 5 |

---

## Phase 3 — Application Foundation

**Epic: E3.1 Next.js + Convex foundation**

| ID | Story | Acceptance Criteria | Priority | Estimate |
|----|-------|---------------------|----------|----------|
| US-3.1 | As a developer, I want a Next.js + TypeScript app (App Router, Tailwind, shadcn/ui, Recharts, MapLibre) scaffolded in `apps/web/`. | - `npm install` works<br>- `npm run dev` runs locally | Must | 5 |
| US-3.2 | As a developer, I want a Convex schema with tables for users, roles, stations, readings, forecasts, risks, alerts, hazard layers, and model versions. | - Schema in `convex/`<br>- Indexes on `stationId` + `timestamp`<br>- Bounded/paginated queries | Must | 5 |
| US-3.3 | As a developer, I want cleaned observations ingested into Convex with units, source timestamps, ingestion timestamps, and quality flags. | - Ingest pipeline documented<br>- No silent zero-filling | Must | 3 |
| US-3.4 | As a user, I want an initial dashboard with station overview, historical water-level/rainfall charts, and data-freshness indicators. | - Dashboard loads charts<br>- Freshness indicators shown | Must | 5 |

---

## Phase 4 — API Integration & Simplified Hosting

**Epic: E4.1 FastAPI ML service + Convex integration**

| ID | Story | Acceptance Criteria | Priority | Estimate |
|----|-------|---------------------|----------|----------|
| US-4.1 | As a developer, I want a FastAPI app wrapping the baseline models with a versioned API contract shared with Convex. | - `app/api/`, `app/core/`, `app/schemas/`, `app/services/`<br>- `/health` endpoint<br>- `feature_schema_version` | Must | 5 |
| US-4.2 | As a developer, I want FastAPI runnable locally via Uvicorn for frontend testing without AWS. | - `uvicorn app.main:app` works locally | Must | 2 |
| US-4.3 | As a product owner, I want the hosting decision (PaaS first vs AWS Lambda/Mangum) documented before infrastructure spend. | - PaaS vs Lambda decision recorded<br>- AWS Budgets alerts configured if AWS path | Must | 2 |
| US-4.4 | As a developer, I want Convex actions to request forecasts from the ML endpoint, persist results, and reactively update the dashboard. | - Convex → ML → Convex → dashboard flow works<br>- ML token never in frontend/Git | Must | 5 |

---

## Phase 5 — Project NOAH Map & Explainability UI

**Epic: E5.1 Hazard map and explainability surfaces**

| ID | Story | Acceptance Criteria | Priority | Estimate |
|----|-------|---------------------|----------|----------|
| US-5.1 | As a user, I want an interactive MapLibre map with remotely hosted Project NOAH PMTiles (5yr/25yr/100yr) and ODbL attribution. | - PMTiles protocol registered<br>- CORS and byte-range verified<br>- Attribution displayed | Must | 5 |
| US-5.2 | As a user, I want station markers, detail panels, legend, and layer controls on the map. | - Markers render<br>- Detail panels functional | Must | 3 |
| US-5.3 | As a user, I want SHAP feature-contribution explanations and risk classifications on the dashboard, labeled with model version, horizon, and data freshness. | - SHAP UI renders<br>- Causality disclaimer present | Must | 5 |

---

## Phase 6 — Alerts & Operational Validation

**Epic: E6.1 Alerting and stakeholder validation**

| ID | Story | Acceptance Criteria | Priority | Estimate |
|----|-------|---------------------|----------|----------|
| US-6.1 | As an LGU operator, I want configurable alert rules and an acknowledgement workflow with user roles (public / LGU / admin). | - Alert rules in Convex<br>- Acknowledgement flow works<br>- Roles enforced | Must | 5 |
| US-6.2 | As a QA engineer, I want failure-mode and missing-data tests (ML downtime, stale/invalid readings, rollback) so the system degrades gracefully. | - Tests documented in `docs/report/` or `docs/issues/`<br>- No silent zero-filling | Must | 5 |
| US-6.3 | As a product owner, I want inference latency benchmarked and warning workflows validated with stakeholders before operational use. | - Benchmark in `docs/report/`<br>- Stakeholder validation recorded | Must | 3 |
| US-6.4 | As a team, I want a Phase 6 retrospective documenting lessons learned. | - Retrospective in `docs/report/` | Should | 1 |

---

## Backlog maintenance

- **Refinement:** Once per sprint (mid-sprint), PO + SM + Dev Team refine upcoming stories, split large items, and update estimates.
- **Ordering:** PO re-orders based on value, risk, and dependency. Phase 1 items are top priority (critical path).
- **Estimation:** Story points (Fibonacci: 1, 2, 3, 5, 8, 13) or T-shirt sizes; team agrees during refinement.
- **Done:** A story is "done" only when it meets [`definition-of-done.md`](definition-of-done.md).
