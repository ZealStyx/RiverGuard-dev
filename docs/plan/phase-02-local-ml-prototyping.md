# Phase 2 — Local ML Prototyping

**Project:** RiverGuard  
**Folder:** `docs/plan/phase-02-local-ml-prototyping.md`  
**Status:** Planned  
**Dependencies:** Phase 1 exit criteria met (Go decision recorded)

---

## Objective

Build reproducible, interpretable baseline models locally and verify explainability outputs **before packaging anything for deployment**. Model training happens outside AWS Lambda (developer machine or separate research environment); Lambda is for inference only.

---

## Entry criteria

- Phase 1 Go/No-Go decision recorded as "Go".
- Clean multi-year dataset available locally for at least one pilot station.
- Forecast targets, horizons, and candidate station-specific thresholds identified.

---

## Key tasks

| # | Task | Details |
|---|------|---------|
| T1 | Define forecast targets, horizons, and station-specific thresholds | Base thresholds on documented local references; review with hydrological / disaster-risk stakeholders where possible. |
| T2 | Build reproducible feature-engineering pipelines | Use Pandas + NumPy in a local Python environment. Features: current/lagged water levels, level change over recent intervals, rolling rainfall totals (1h/3h/6h/24h), antecedent rainfall, catchment/river/elevation attributes, soil moisture and forecast rainfall when available. Track missingness and input quality. |
| T3 | Train baseline XGBoost / Scikit-learn models | Regression for water-level forecasting; classification for threshold-exceedance risk. Compare against persistence and simple statistical baselines. |
| T4 | Generate local SHAP plots | Verify explainability outputs. Present SHAP as model contribution, **not** physical causation. |
| T5 | Evaluate with chronological / event-based splits | Do **not** randomly mix observations from the same time series or storm event across train/test sets. Use time-aware validation. |
| T6 | Report target metrics | Water-level regression: MAE, RMSE, bias by horizon/station. Risk classification: precision, recall, F1, PR-AUC, confusion matrix. Probability estimates: calibration curve, Brier score. Operational behavior: data freshness, missing-input handling, inference latency, alert lead time. |

---

## Exit criteria

- Baseline models train reproducibly and are evaluated on held-out chronological data.
- SHAP explanations generated and reviewed.
- Evaluation results documented in `docs/report/`.
- No model described as reliable for operational deployment without held-out validation.

---

## Risks

- Overfitting from random (non-chronological) splits; always use time-aware validation.
- Deep-learning complexity before data quantity/quality is understood; start with interpretable baselines.
- Treating unavailable inputs as measured values; track missingness explicitly.

---

## Deliverables

| Deliverable | Location |
|-------------|----------|
| Feature-engineering pipeline | `services/ml/` (local, not committed if large) |
| Trained baseline model artifacts | `services/ml/models/` (do not commit large binaries) |
| SHAP explanation outputs | Local review; document in `docs/report/` |
| Evaluation report (MAE/RMSE, precision/recall/F1, calibration) | `docs/report/` |

---

## Related

- Root README: [Machine-Learning Approach](../README.md#machine-learning-approach), [Development Roadmap — Phase 2](../README.md#phase-2--local-ml-prototyping)
- `docs/plan/MASTER_PLAN_ROADMAP.md`
- `docs/architecture/riverguard-architecture.md` (Section 9: Machine-learning design)
