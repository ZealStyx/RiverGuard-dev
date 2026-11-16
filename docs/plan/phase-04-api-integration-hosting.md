# Phase 4 — API Integration & Simplified Hosting

**Project:** RiverGuard  
**Folder:** `docs/plan/phase-04-api-integration-hosting.md`  
**Status:** In progress — pipeline built, awaiting a Convex deployment to verify the write path
**Dependencies:** Phase 3 complete (dashboard + Convex ingest working)

---

> **Dataset note (2026-11-15):** dataset v2 (`data/RiverGuard_NCR_Dataset_v2.xlsx`, 2016-01-01 → 2026-11-14,
> 15,884 rows) exists and is usable for schema and pipeline work. `WaterLevel_m`, `SoilMoisture_pct`,
> and `FloodOccurrence` are **derived from rainfall**, so anything built on them demonstrates plumbing,
> not validated hydrology — the UI must label them as such. See [`docs/data-sources.md`](../data-sources.md).

## Current status (2026-11-15)

| Piece | State |
|---|---|
| Weather provider adapter | Built — `apps/web/src/lib/weather/` (Open-Meteo primary, offline fixture fallback, both labelled) |
| ML service | Built — `services/ml/` FastAPI, 6 endpoints, 24 tests passing, bit-exact against the exported model |
| Orchestrating route | Built — `POST /api/forecast`; verified end to end with the fixture provider and the live ML service |
| Convex write path | Built — `forecasts:recordOutlook` writes runs, forecasts, assessments, model versions and alerts |
| Convex read path | Built — `forecasts:latestOutlook` + `alerts:listOpenForLocation`, consumed via `makeFunctionReference` |
| Scheduled refresh | **Not possible** — a Convex cron cannot reach this machine. `convex/crons.ts` only fails stale runs. See §6 of the pipeline guide |
| Verified against a real deployment | **Pending** — run `npx convex dev` and press Refresh once |

Runbook: [`docs/guides/forecast-pipeline.md`](../guides/forecast-pipeline.md).

## Objective

Wrap the working local models into a FastAPI inference service and connect Convex to it so forecasts flow from the ML service → Convex → dashboard reactively.

---

## Entry criteria

- Phase 3 exit criteria met.
- Trained baseline model artifacts exist locally.
- Feature schema defined (shared between Convex and Python service).

---

## Key tasks

| # | Task | Details |
|---|------|---------|
| T1 | Wrap models into FastAPI application | `services/ml/` with `app/api/`, `app/core/`, `app/schemas/`, `app/services/`. Expose a `/health` endpoint for local Uvicorn testing. |
| T2 | Keep FastAPI runnable locally via Uvicorn | `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` for frontend testing without deploying to AWS. |
| T3 | Define and version the shared API contract | Request/response schemas, `feature_schema_version`, station ID, generated_at, input_window, measurements, thresholds. Version the contract between Convex and the Python service. |
| T4 | Evaluate hosting: PaaS first, AWS Lambda/Mangum only if required | Per the root README Phase 4, evaluate simplified PaaS providers (e.g. Render/Railway) first to save time. Proceed with AWS Lambda + Mangum only if a PaaS option does not meet project needs. |
| T5 | (AWS path) Deploy Lambda container image | Build Lambda-compatible container (`services/ml/Dockerfile`), push to Amazon ECR, create Lambda function, configure Lambda Function URL, least-privilege IAM, store ML auth token server-side only (Convex + Lambda env vars), never in frontend code or Git. |
| T6 | Connect Convex actions to ML endpoint | Convex action reads bounded observations + thresholds, POSTs validated payload to ML URL, validates + stores prediction/risk records, reactively updates dashboard. |

---

## Exit criteria

- FastAPI service reachable from Convex (local Uvicorn or deployed endpoint).
- Convex can request a forecast, receive structured JSON, persist it, and update the dashboard.
- ML token and AWS credentials never in frontend code or committed to Git.

## Cost guardrails (AWS path)

- US$130 AWS credit balance; verify balance/expiration/eligibility in AWS Billing before deploying.
- Configure AWS Budgets alerts (50% / 80% / 100%) before repeated deployment or load testing.
- One Lambda function, one ECR repository; no provisioned concurrency; conservative reserved concurrency; small container image (inference deps + model artifact only).
- Train models locally; use Lambda for inference only.

---

## Risks

- PaaS evaluation chosen but later found unsuitable, causing rework; set clear go/no-go criteria for PaaS vs Lambda.
- Cold starts adding latency for time-sensitive workflows; benchmark cold-start/warm execution/memory/latency with representative payloads.
- Exposing ML token to browser; keep all secrets server-side only.

---

## Deliverables

| Deliverable | Location |
|-------------|----------|
| FastAPI application | `services/ml/app/` |
| Shared API contract (versioned) | `docs/reference/` or `data/schemas/` |
| Local Uvicorn run command | Documented in root README / this file |
| (AWS) Lambda container image + ECR | `services/ml/Dockerfile`, Amazon ECR (not committed to Git) |
| Convex → ML integration | `convex/` actions |

---

## Related

- Root README: [How the ML Service Works](../README.md#how-the-ml-service-works), [AWS Deployment and Credit Management](../README.md#aws-deployment-and-credit-management), [Development Roadmap — Phase 4](../README.md#phase-4--api-integration--simplified-hosting)
- `docs/plan/MASTER_PLAN_ROADMAP.md`
- `docs/architecture/riverguard-architecture.md` (Sections 2, 6, 7, 11)
