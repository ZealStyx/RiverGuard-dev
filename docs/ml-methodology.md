# ML Methodology — RiverGuard NCR

**Last updated:** 2026-11-15
**Applies to:** Model A (water-level forecasting) and Model B (localized flood-occurrence risk)
**Dataset:** [`data/README.md`](../data/README.md) · **Sources:** [`data-sources.md`](data-sources.md)

> RiverGuard is decision support, not an official warning authority. Nothing in this document
> makes a model operational. Every model ships with a model card stating intended use, coverage,
> and known failure modes.

---

## 1. Two models, two gates

| | Model A | Model B |
|---|---|---|
| Question | What will the water level be at station *s*, horizon *h*? | What is the probability of flooding in unit *u* on day *d*? |
| Task type | Regression | Binary classification (probability) |
| Target | `WaterLevel_m` at *t+h* | `FloodOccurrence` at *t+h* |
| Minimum data gate | Timestamped gauge series with a documented datum | Dated, geographically attributable event labels |
| Gate status today | **No-Go** — no gauge series exists | **No-Go** for calibrated probabilities — labels are a rule-based proxy |

Both gates are open only when **real observations** replace the derived columns in dataset v2.
Until then, models built here validate the *code path*, not the hydrology.

## 2. The circularity hazard (read before trusting any metric)

Dataset v2 derives several columns from rainfall with published formulas:

```
SoilMoisture_pct  = clip(SM_{t-1} + Rain − ET0 − 0.08·SM_{t-1}, 5, 95)
WaterLevel_m      = base + 0.006·Ant7 + 0.018·Rain + 0.004·Ant3 + ((A3−A1)/40000)·Rain² + ε
FloodOccurrence   = 1 if WL ≥ Alarm1 or (Rain ≥ 100 and Ant7 ≥ 150) or Ant3 ≥ 250
```

A model given rainfall and asked to predict water level will largely **recover this formula**.
That produces excellent-looking MAE/R² and zero physical insight. Consequences for practice:

- Report any metric from dataset v2 under a heading like *"pipeline validation on synthetic data"*,
  never under "results".
- Sanity-check the model against the formula: if a boosted tree cannot beat the linear form above,
  the pipeline is wrong, not the hydrology.
- The same applies to Model B: `FloodOccurrence` is a deterministic rule over the same features,
  so PR-AUC measures agreement with the rule.

## 3. Features

Frozen definitions live in the `Data_Dictionary` tab of the workbook. Reuse them; do not
recompute rolling sums with different windows, or train/serve skew appears immediately.

| Group | Columns | Notes |
|---|---|---|
| Rainfall | `Rainfall_mm`, `AntecedentRain_3d/7d/30d_mm` | Already shifted one day → leakage-safe |
| Catchment state | `SoilMoisture_pct`, `ET0_mm`, `Tmax_C`, `Tmin_C` | Bucket state is a slow memory of past rain |
| River state | `WaterLevel_m`, `WaterLevel_Change_24h_m` | Lags only — never the same-day value |
| Static | `Location`, `Elevation_m`, `Latitude`, `Longitude` | Encode as categorical/one-hot; never as a numeric trend |
| Calendar | month, day-of-year, wet-season flag | Monsoon seasonality is strong; include it explicitly |
| Excluded | `Split`, `RainSource`, `RiskLevel`, `DataSource`, `Notes` | These encode provenance or the label rule, not weather |

**Never** use `RainSource` as a feature: the provenance boundary (2025-11-15) is an artefact of
data collection, not a physical signal. A model that learns it will look accurate and fail on
real data.

## 4. Splits

| Split | Window | Rows | Positives |
|---|---|---|---|
| train | 2016-01-01 → 2023-12-31 | 11,688 | 256 |
| validation | 2024-01-01 → 2024-12-31 | 1,464 | 19 |
| test | 2025-01-01 → 2026-11-14 | 2,732 | 53 |

Rules:

1. Take the `Split` column as given; never shuffle or re-split randomly.
2. Keep whole storm events on one side of a boundary. Add a **leave-one-event-out** check over
   Ulysses (2020-11) and the 2018-08 calibration storm as a second, harsher evaluation.
3. Fit all preprocessing (scalers, encoders) on `train` only.
4. The test window contains the only real (ERA5) rainfall in the series — treat its metrics as a
   separate, harder regime change, not as a continuation of train.

## 5. Baselines before models

Cheap, interpretable references that any learned model must beat:

| Model | Baseline | Metric to beat |
|---|---|---|
| A | Persistence (`WL_{t+h} = WL_t`) | MAE, RMSE per station and horizon |
| A | Climatological mean by month | MAE |
| A | Linear regression on `Ant7`, `Rain` | MAE — this is the generator's own form |
| B | "Flood if `Ant7` ≥ 150 mm" rule | recall at fixed precision |
| B | Logistic regression on 3 features | PR-AUC |

If a baseline wins, publish that — a defensible rule beats an unexplainable model.

## 6. Metrics

**Model A (regression)**
- MAE and RMSE by station and horizon; report bias separately (systematic under/over-prediction).
- Error conditional on regime: dry season vs wet season vs event days.
- Peak-timing error for events, not just magnitude error — a late alarm is useless.

**Model B (classification, ~2 % prevalence)**
- Precision, recall, F1, **PR-AUC** (not ROC-AUC alone), confusion matrix at a stated threshold.
- **Probability calibration**: reliability curve and Brier score. An uncalibrated score must not
  be shown to users as a percentage chance.
- Operational framing: false-alarm rate per season, missed events per season, and **alert lead
  time** relative to the alarm-level crossing.

Never report accuracy as the headline metric at 2 % prevalence.

## 7. Explainability

- SHAP values for tree models; keep to the top ~10 features and state the baseline value.
- Present as **model contribution, not physical causation** — the UI copy must say so.
- Review plots for plausibility: antecedent rain and soil moisture should dominate; if
  `Elevation_m` or `Latitude` dominates, the model is memorising cities.
- For dataset v2, SHAP will largely recover the generator formula. Say so next to the plot.

## 8. Reproducibility and records

Every run records: dataset version + file hash, feature list and definitions, hyper-parameters,
random seed, split definition, library versions, metrics, and the exact command. Store in
`docs/report/`. Model binaries stay out of Git (`*.pkl`, `*.joblib`, `*.onnx` are ignored).

## 9. Model card minimum

1. Intended use and explicit non-uses (not an evacuation trigger).
2. Geographic and temporal coverage actually supported.
3. Training data provenance, including which columns were derived.
4. Metrics with the exact split, plus the baselines they were compared against.
5. Calibration status of any probability.
6. Known failure modes (missing inputs, reanalysis lag, storm types not represented).
7. Version, date, and the person who validated it.

## 10. Exit criteria for Phase 2

- Baselines and at least one learned model per task, evaluated on the chronological split.
- Calibration curve and PR-AUC reported for Model B; MAE/RMSE/bias by station for Model A.
- SHAP reviewed and labelled as contribution, not causation.
- A written statement of what the results *cannot* claim while the dataset is synthetic.
- Model cards stored in `docs/report/`.
