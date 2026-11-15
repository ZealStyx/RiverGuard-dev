# Phase 2 — Local ML Prototyping

**Project:** RiverGuard  
**Folder:** `docs/plan/phase-02-local-ml-prototyping.md`  
**Status:** Ready to start for pipeline/feature work (dataset v2 available); baseline *performance* claims blocked  
**Dependencies:** Phase 1 Go record — 2026-11-15: Conditional Go for engineering, No-Go for operational models  
**Last updated:** 2026-11-15

---

## Objective

Build reproducible, interpretable baseline models locally and verify explainability outputs **before packaging anything for deployment**. Model training happens outside AWS Lambda (developer machine or separate research environment); Lambda is for inference only.

---

## Entry criteria

- ✅ Phase 1 Go/No-Go decision recorded (2026-11-15) — see
  [`phase-01-data-acquisition-exploration.md`](phase-01-data-acquisition-exploration.md#go--no-go-record).
  **Engineering/Conditional Go** applies; **operational No-Go** remains for both models.
- ✅ Multi-year dataset available: `data/daily_observations.csv` (15,884 rows, 2016-01-01 → 2026-11-14).
- ⬜ Forecast targets and horizons confirmed with a stakeholder (only daily resolution exists today).
- ✅ Station-specific threshold references recorded — PAGASA warnings, Marikina 15/16/18 m, Pasig 12/12.5/13 m.

### Dataset contract for this phase

| Column | Kind | Use |
|---|---|---|
| `Rainfall_mm` | Synthetic before 2025-11-15, **real ERA5** after (`RainSource`) | Primary driver input |
| `AntecedentRain_3d/7d/30d_mm` | Derived, shifted one day | Leakage-safe antecedent features |
| `SoilMoisture_pct` | Derived bucket state | Saturation feature |
| `WaterLevel_m`, `WaterLevel_Change_24h_m` | Derived | Model A target / lag features |
| `FloodOccurrence` | Rule-based proxy | Model B target (see warning below) |
| `RiskLevel`, `Split` | Derived | Stratification aid / chronological split key |

**Two hard rules while this dataset is in use:**

1. **Never report metrics from Models A/B as NCR flood-prediction skill.** `WaterLevel_m` is
   derived from `Rainfall_mm`, so a water-level model will mostly be relearning the generator's
   formula; `FloodOccurrence` is a rule over the same inputs, so classification metrics measure
   agreement with the rules. Report them as *pipeline validation*, in a clearly labelled section.
2. **Use `Split` as given** (train 2016–2023 / validation 2024 / test 2025–2026). Do not shuffle,
   and do not let `RainSource` become a feature — the provenance boundary is not hydrology.

---

## Key tasks

| # | Task | Details |
|---|------|---------|
| T1 | Define forecast targets, horizons, and station-specific thresholds | Base thresholds on documented local references; review with hydrological / disaster-risk stakeholders where possible. With daily-only data, the only defensible horizon today is **D+1 daily**; D+2–D+7 must wait for higher-resolution inputs. |
| T2 | Build reproducible feature-engineering pipelines | Use Pandas + NumPy in a local Python environment. Features: current/lagged water levels, level change over recent intervals, rolling rainfall totals, antecedent rainfall, catchment/river/elevation attributes, soil moisture and forecast rainfall when available. They already exist in dataset v2 (`AntecedentRain_3/7/30d_mm`, `WaterLevel_Change_24h_m`, `SoilMoisture_pct`) — reuse the definitions in `Data_Dictionary` rather than recomputing differently. Track missingness and input quality. |
| T3 | Train baseline XGBoost / Scikit-learn models | Regression for water-level forecasting; classification for threshold-exceedance risk. Compare against persistence and simple statistical baselines. |
| T4 | Generate local SHAP plots | Verify explainability outputs. Present SHAP as model contribution, **not** physical causation. |
| T5 | Evaluate with chronological / event-based splits | Do **not** randomly mix observations from the same time series or storm event across train/test sets. Use the supplied `Split` column, then add a leave-one-event-out check (Ulysses 2020-11, Habagat 2018-08) as a second, harsher test. |
| T6 | Report target metrics | Water-level regression: MAE, RMSE, bias by horizon/station. Risk classification: precision, recall, F1, PR-AUC, confusion matrix. Probability estimates: calibration curve, Brier score. Operational behavior: data freshness, missing-input handling, inference latency, alert lead time. |

---

## Exit criteria

- Baseline models train reproducibly and are evaluated on held-out chronological data.
- SHAP explanations generated and reviewed.
- Evaluation results documented in `docs/report/`.
- No model described as reliable for operational deployment without held-out validation.

---

## Risks

- **Circularity (new):** `WaterLevel_m` and `FloodOccurrence` are deterministic functions of
  `Rainfall_mm` in dataset v2. A model can score well by reverse-engineering the generator.
  Mitigate by reporting the generator formula alongside any metric and by re-running on real
  gauge data before drawing conclusions.
- `RainSource` changes mid-series (synthetic → ERA5 at 2025-11-15). A model must not learn that
  boundary; check feature importance for date-adjacent artefacts.
- Overfitting from random (non-chronological) splits; always use time-aware validation.
- Deep-learning complexity before data quantity/quality is understood; start with interpretable baselines.
- Treating unavailable inputs as measured values; track missingness explicitly.

---

## Deliverables

| Deliverable | Location |
|-------------|----------|
| Feature-engineering pipeline | `services/ml/` (currently an empty scaffold — not yet implemented) |
| Trained baseline model artifacts | `services/ml/models/` (do not commit large binaries) |
| SHAP explanation outputs | Local review; document in `docs/report/` |
| Evaluation report (MAE/RMSE, precision/recall/F1, calibration) | `docs/report/` — label any v2-dataset results as pipeline validation |
| Dataset used | `data/daily_observations.csv` + [`data/README.md`](../../data/README.md) |

---

## Related

- Root README: [Machine-Learning Approach](../README.md#machine-learning-approach), [Development Roadmap — Phase 2](../README.md#phase-2--local-ml-prototyping)
- `docs/plan/MASTER_PLAN_ROADMAP.md`
- `docs/architecture/riverguard-architecture.md` (Section 9: Machine-learning design)
