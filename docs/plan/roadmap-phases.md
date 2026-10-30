# RiverGuard Delivery Plan — Phased Roadmap

This plan expands the [Development Roadmap](../README.md#development-roadmap) in the root README into six delivery phases. Each phase lists its objectives, key tasks, entry criteria, exit criteria, and go/no-go decisions. Phases should be executed in order; do not start a later phase until the previous phase's exit criteria are met.

RiverGuard is proprietary software and is in early development. No prediction, probability, or warning should be treated as operational or validated until the underlying data and models have been tested for their intended use.

## Phase 1 — Data Acquisition & Exploration (Critical Path)

**Objective:** Secure a working, clean historical dataset spanning multiple years before any web or model work proceeds.

### Entry criteria
- Repository access configured; development accounts (GitHub, Convex, Vercel, AWS) available as needed.

### Key tasks
1. Secure historical rainfall and river-level CSV data (e.g., via DOST-ASTI PhilSensors or PAGASA).
2. Document source licensing, coverage, measurement units, timezone conventions, and update frequency for every source.
3. Clean the dataset locally: handle missing data, NaNs, and timezone alignment.
4. Record data provenance, transformations, and quality status; do not silently replace missing measurements with zero.
5. Identify candidate stations, forecast horizons, and station-specific threshold references.

### Exit criteria
- A clean, multi-year dataset is available locally for at least one pilot station.
- Source licensing, coverage, units, and update frequency are documented in `docs/reference/`.
- **Go/No-Go decision:** Do not proceed to web development until this decision is recorded as "Go".

### Risks
- Data availability, access permissions, geographic coverage, or quality may not support forecasting. Confirm before depending on any source.

## Phase 2 — Local ML Prototyping

**Objective:** Build reproducible, interpretable baseline models locally and verify explainability outputs before packaging anything for deployment.

### Entry criteria
- Phase 1 exit criteria met ("Go" decision recorded).

### Key tasks
1. Define forecast targets, horizons, and station-specific thresholds based on acquired data; review thresholds with hydrological/disaster-risk stakeholders where possible.
2. Build reproducible feature-engineering pipelines in a local Python environment (Pandas, NumPy).
3. Train baseline XGBoost/Scikit-learn regression models on local machines.
4. Generate local SHAP plots to verify explainability outputs; distinguish model contribution from physical causation.
5. Evaluate models using chronological or event-based train-test splits (no random mixing across time series or storm events).
6. Report target metrics: MAE, RMSE, bias by horizon/station; precision, recall, F1, PR-AUC for risk classification; calibration/Brier score for probability estimates.

### Exit criteria
- Baseline models train reproducibly and are evaluated on held-out chronological data.
- SHAP explanations are generated and reviewed.
- Evaluation results are documented in `docs/report/`.
- No model is described as reliable for operational deployment without held-out validation.

## Phase 3 — Application Foundation

**Objective:** Initialize the web application and Convex backend, and ingest cleaned observations into Convex.

### Entry criteria
- Phase 2 exit criteria met; baseline model artifacts and feature schemas are available.

### Key tasks
1. Initialize the Next.js application and TypeScript configuration (`apps/web`).
2. Configure Convex and implement the initial schema (users, roles, LGU profiles, station metadata, readings, forecasts, risk assessments, alerts, hazard-layer metadata, model-version metadata).
3. Create indexes for actual access patterns (e.g., station identifier + timestamp for bounded time windows); use pagination and bounded queries.
4. Ingest cleaned CSV observations into Convex.
5. Build the initial dashboard layout: historical water-level and rainfall charts, data-freshness indicators, station overview.

### Exit criteria
- Next.js app runs locally (`npm run dev`) and connects to Convex.
- Station metadata and readings are queryable in Convex.
- Initial dashboard loads historical charts and freshness indicators.

## Phase 4 — API Integration & Simplified Hosting

**Objective:** Wrap the working models into a FastAPI inference service and connect Convex to it.

### Entry criteria
- Phase 3 exit criteria met; trained baseline model artifacts exist locally.

### Key tasks
1. Wrap the working XGBoost/SHAP models into a FastAPI application (`services/ml`).
2. Keep FastAPI runnable locally through Uvicorn for frontend testing (health endpoint included).
3. Define and version the API contract shared between Convex and the Python service (request/response schemas, `feature_schema_version`).
4. Evaluate simplified PaaS hosting first to save time; proceed with AWS Lambda/Mangum only if required.
5. If using AWS: build the Lambda-compatible container image, push to Amazon ECR, create the Lambda function, configure a Lambda Function URL, set least-privilege IAM, store the ML auth token server-side only.
6. Connect Convex actions to the deployed ML endpoint; validate and store prediction records; reactively update dashboards.

### Exit criteria
- FastAPI service is reachable from Convex (local Uvicorn or deployed endpoint).
- Convex can request a forecast, receive a structured JSON result, persist it, and update the dashboard.
- ML token and AWS credentials are never in frontend code or committed to Git.

### Cost guardrails (AWS path)
- US$130 AWS credit balance; configure AWS Budgets alerts (e.g., 50/80/100% of a monthly target) before repeated deployment or load testing.
- One Lambda function, one ECR repository; no provisioned concurrency; conservative reserved concurrency; small container image (inference dependencies + model artifact only).

## Phase 5 — Project NOAH Map & Explainability UI

**Objective:** Add the interactive hazard map and explainability surfaces to the dashboard.

### Entry criteria
- Phase 4 exit criteria met; forecast and risk results flow from the ML service to Convex.

### Key tasks
1. Integrate MapLibre GL JS and load remotely hosted Project NOAH PMTiles (flood_5yr, flood_25yr, flood_100yr from BetterGov.PH on Hugging Face).
2. Verify CORS and HTTP byte-range support on the Hugging Face endpoint before relying on remote hosting.
3. Render station markers, station detail panels, map legend, layer controls, and attribution.
4. Render SHAP feature-contribution explanations and risk classifications on the Next.js dashboard.
5. Clearly distinguish model contribution from physical causation; label data freshness, model version, and forecast horizon.

### Exit criteria
- Flood hazard layers render alongside station markers and overlays.
- Explainability UI displays feature contributions for individual predictions.
- Attribution and license information for Project NOAH (ODbL) are displayed.

## Phase 6 — Alerts and Operational Validation

**Objective:** Add alerting, test failure modes, and validate with stakeholders.

### Entry criteria
- Phase 5 exit criteria met; map and explainability UI are operational.

### Key tasks
1. Implement configurable alert rules and alert history/acknowledgement workflow in Convex.
2. Add user roles: public users, LGU personnel, system administrators.
3. Test service failures, missing/stale/invalid observations, and deployment rollback.
4. Benchmark cold-start time, warm execution time, memory consumption, and prediction latency using representative station payloads.
5. Validate warning workflows with relevant stakeholders or academic advisers.
6. Record phase retrospective in `docs/report/`.

### Exit criteria
- Alert rules and acknowledgement workflow function end-to-end.
- Failure and missing-data handling behave as specified (no silent zero-filling).
- Stakeholder validation documented; no experimental predictions presented as operational public-safety warnings.

## Cross-cutting rules

- **Safety:** RiverGuard supports decision-making; it does not issue official evacuation orders or replace LGUs and government agencies. Static Project NOAH maps are not forecasts; return periods are not schedules.
- **Documentation:** Update `docs/` when architecture or data contracts change.
- **No large binaries:** Do not commit datasets, PMTiles archives, or large model binaries without an explicit reason and approved storage strategy.
- **Secrets:** Never commit ML tokens, AWS credentials, or deployment secrets.
