# Test model — next-day flood probability and water level

A small, honest model trained on the v2 dataset, plus a page where you set the weather and see the
output. It exists to prove the whole path works: CSV → features → model → JSON → browser, with no
server and no network in the loop.

> **It is a test model, not a forecasting product.** Water level and flood labels in dataset v2 are
> _derived from rainfall by formulas_. A model can therefore recover the generator, and the scores
> below measure that recovery — not hydrological skill. See
> [`docs/ml-methodology.md`](../docs/ml-methodology.md) §2.

## Open it

```bash
open ml/predictor.html        # macOS
xdg-open ml/predictor.html    # Linux
```

One self-contained file (~200 KB): the two models are inlined as JSON, the charts are inline SVG,
and nothing is fetched at runtime.

## What it predicts

| Head       | Target                       | Features                                                                                                         |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Classifier | `FloodOccurrence` at **t+1** | tomorrow's rain and temperature, today's rain, antecedent 3/7/30-day rain, soil moisture, month, elevation, city |
| Regressor  | `WaterLevel_m` at **t+1**    | same vector                                                                                                      |

Both are gradient-boosted trees: 200 estimators, `max_depth=3`, learning rate 0.06 (classifier) and
0.08 (regressor), seed 42. Trained on 2016–2023, threshold tuned on 2024, evaluated on
2025-01-01 → 2026-11-14. No sample from the test window was used for fitting or for choosing the
operating threshold.

## Results on the held-out test window

2,728 samples, 46 flood days (1.69 %).

| Classifier        |  Value | Regressor                   |   Value |
| ----------------- | -----: | --------------------------- | ------: |
| Average precision |  0.713 | MAE                         | 0.057 m |
| ROC-AUC           |  0.994 | RMSE                        | 0.075 m |
| Brier score       | 0.0082 | R²                          |   0.997 |
| Precision @ 0.400 |   0.63 | Persistence MAE (must beat) | 0.091 m |
| Recall @ 0.400    |   0.65 | Marikina MAE                | 0.061 m |

Plain-rule baselines on the same window:

| Rule                                                 | Precision | Recall |
| ---------------------------------------------------- | --------: | -----: |
| antecedent 7-day rain ≥ 150 mm                       |      0.25 |   0.70 |
| forecast rain ≥ 50 mm                                |      0.25 |   0.11 |
| dataset's own flood rule (rain ≥ 100 and ant7 ≥ 150) |      0.00 |   0.00 |

The model matches the best rule's recall at about three times its precision. The dataset rule scoring
zero is not a bug: it fires on none of the 46 test positives, which is a fair warning that a
hand-written threshold tuned on the training era does not transfer.

**Size of the win:** the regressor beats persistence by 0.034 m of MAE, and the classifier's edge over
`ant7 ≥ 150` is precision. Both are worth reporting; neither is evidence that the system would work
on a real gauge.

## Why the classifier looks bimodal

The label is a rule — `WL ≥ alarm1 OR (rain ≥ 100 and ant7 ≥ 150) OR ant3 ≥ 250` — so it is a step
function of the inputs. The model learns the step, and its probability jumps from ~0.1 % to ~95 %
across a few millimetres of rain. That is what the "probability vs tomorrow's rain" chart in the page
shows. It is the correct behaviour for this dataset and the clearest possible illustration of why the
dataset cannot support a calibrated operational probability.

## Files

| File                      | Purpose                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `train_test_model.py`     | Builds samples, trains both heads, evaluates, exports. Also verifies its own export: the flat-array trees must reproduce scikit-learn to 1e-9. |
| `build_predictor.py`      | Inlines `artifacts/model.json` into `predictor_template.html` → `predictor.html`.                                                              |
| `predictor_template.html` | The page, with a `__MODEL_JSON__` placeholder.                                                                                                 |
| `predictor.html`          | **Generated.** The file you open. Do not hand-edit.                                                                                            |
| `artifacts/model.json`    | Trees, feature spec, alarm levels, metrics, replay examples.                                                                                   |
| `artifacts/metrics.json`  | Evaluation detail (what the script prints).                                                                                                    |

Regenerate everything:

```bash
python3 data/generate_dataset.py     # if the dataset is stale
python3 ml/train_test_model.py
python3 ml/build_predictor.py
```

Requires `scikit-learn`, `pandas`, `numpy` (`pip install scikit-learn pandas`). The page itself
requires nothing.

## What is on the page

1. **Conditions** — city, the nine model inputs, four presets (dry day → Ulysses-class), and four
   replay buttons loaded from held-out test rows with their recorded outcome.
2. **Prediction** — flood probability with the operating-threshold marker, predicted water level with
   a ±1.96·RMSE interval, the three alarm levels for that city, and a status chip. Below it, two
   marginal-response curves and a sensitivity ranking (each input pushed to the ends of its range
   with the others fixed — sensitivity, not SHAP).
3. **Seven-day outlook** — seven editable rainfall amounts, chained through antecedent totals and a
   soil-moisture bucket, drawn as bars + a water-level line against the alarm levels.

## Wiring it to a weather API (the next step)

The page's inputs map 1:1 onto a daily forecast response, which is why the seven-day panel exists:

| Input                   | Where it comes from                                                       |
| ----------------------- | ------------------------------------------------------------------------- |
| `rain_next`             | forecast precipitation total for day _d_                                  |
| `rain_today`            | observed/analysed precipitation for day _d−1_                             |
| `ant3`, `ant7`, `ant30` | running sums over the previous 3/7/30 days of the observed series         |
| `soil`                  | water-balance bucket state, carried forward (`SM + rain − ET0 − 0.08·SM`) |
| `tmax`, `tmin`          | forecast daily min/max temperature                                        |
| `month`                 | the forecast date                                                         |

For a seven-day run, the chain in `chainFrom()` is already the right shape: predict day _d_, then feed
day _d_'s rain into the antecedent sums and the soil bucket before predicting day _d+1_. Swapping the
manual sliders for fetched values is a data-plumbing change, not a modelling one.

## Known limits

- Derived targets; see the warning above. Do not quote these numbers as forecast skill.
- One row per city per day. No station-level, hourly, or barangay resolution.
- Alarm levels for Quezon City, Manila and Pasig are representative or indicative; only the Marikina
  River values (15 / 16 / 18 m) are documented.
- The 2 % base rate means precision is unstable: 53 positives in the test window is a small sample,
  and a single event moves recall by ~2 percentage points.
- The model has never seen a real gauge reading, a typhoon forecast, or a rainfall NowCast.
