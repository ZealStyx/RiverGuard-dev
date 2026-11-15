#!/usr/bin/env python3
"""Train the RiverGuard test model on the v2 dataset and export it for the browser.

This is a *test* model, in the literal sense: it exists to prove the pipeline
(CSV -> features -> model -> JSON -> interactive page) end to end. It is not a
forecasting product. Two heads are trained on the same features:

  * classifier  P(flood tomorrow)      target: FloodOccurrence at t+1
  * regressor   water level tomorrow   target: WaterLevel_m at t+1

Because WaterLevel_m and FloodOccurrence in dataset v2 are derived from rainfall
by published formulas, a model can largely recover the generator. Metrics below
measure agreement with that generator, not hydrological skill. See
docs/ml-methodology.md section 2.

Usage:
    python3 ml/train_test_model.py            # train, evaluate, export
    python3 ml/train_test_model.py --quiet    # only write files

Outputs:
    ml/artifacts/model.json    trees + feature spec + thresholds + metrics
    ml/artifacts/metrics.json  evaluation detail (also printed)
"""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    mean_absolute_error,
    mean_squared_error,
    precision_recall_curve,
    precision_recall_fscore_support,
    r2_score,
    roc_auc_score,
)

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "data" / "daily_observations.csv"
OUT = ROOT / "ml" / "artifacts"
SEED = 42

# Alarm levels (metres) per city. Source: PAGASA / LGU, see data/stations.csv
# and docs/data-sources.md. Pasig values are indicative and flagged as such.
CITIES = {
    "Marikina": dict(
        station="EFCOS Sto. Niño (Marikina River)", river="Marikina River",
        lat=14.65, lon=121.10, elev=24.0, alarms=[15.0, 16.0, 18.0], alarms_verified=True,
    ),
    "Quezon City": dict(
        station="PAGASA Science Garden (representative)", river="San Juan / Tullahan",
        lat=14.6509, lon=121.0486, elev=55.0, alarms=[13.0, 14.0, 15.0], alarms_verified=False,
    ),
    "Manila": dict(
        station="PAGASA Port Area / Pandacan reach", river="Pasig River",
        lat=14.587, lon=120.979, elev=15.0, alarms=[12.0, 12.5, 13.0], alarms_verified=False,
    ),
    "Pasig": dict(
        station="EFCOS Rosario (Pasig River)", river="Pasig River",
        lat=14.59, lon=121.07, elev=20.0, alarms=[12.0, 12.5, 13.0], alarms_verified=False,
    ),
}

# Feature order is frozen: the browser evaluator indexes into this list.
FEATURES = [
    dict(key="rain_next", label="Forecast rain tomorrow", unit="mm", min=0, max=400, step=1, default=25,
         help="Daily total for the day being predicted."),
    dict(key="rain_today", label="Rain so far today", unit="mm", min=0, max=400, step=1, default=0,
         help="Today's observed total; drives tomorrow's river response."),
    dict(key="ant3", label="Rain, previous 3 days", unit="mm", min=0, max=700, step=1, default=20,
         help="Rolling 3-day total before today. Above 250 mm the dataset's rule flags a flood day."),
    dict(key="ant7", label="Rain, previous 7 days", unit="mm", min=0, max=1000, step=1, default=45,
         help="Rolling 7-day total before today. Above 150 mm with ≥100 mm today is a flood rule."),
    dict(key="ant30", label="Rain, previous 30 days", unit="mm", min=0, max=2000, step=1, default=130,
         help="Catchment wetness memory."),
    dict(key="soil", label="Soil moisture", unit="%", min=5, max=95, step=1, default=45,
         help="Saturation before tomorrow's rain."),
    dict(key="tmax", label="Max temperature tomorrow", unit="°C", min=22, max=40, step=0.5, default=31),
    dict(key="tmin", label="Min temperature tomorrow", unit="°C", min=18, max=30, step=0.5, default=25),
    dict(key="month", label="Month", unit="", min=1, max=12, step=1, default=8,
         help="Season: the wet season peaks July–September."),
]
CITY_KEYS = ["Quezon City", "Marikina", "Manila", "Pasig"]


# ---------------------------------------------------------------------------
# 1. Samples: row t gives the state, row t+1 gives the weather being forecast.
# ---------------------------------------------------------------------------
def build_samples(df: pd.DataFrame) -> pd.DataFrame:
    frames = []
    for city, g in df.groupby("Location", sort=True):
        g = g.sort_values("Date").reset_index(drop=True)
        nxt = g.shift(-1)
        ok = (nxt["Date"].notna() & (g["Split"] == nxt["Split"])).to_numpy()
        frames.append(pd.DataFrame({
            "city": city,
            "target_date": nxt["Date"].to_numpy(),
            "split": nxt["Split"].to_numpy(),
            "rain_next": nxt["Rainfall_mm"].to_numpy(),
            "rain_today": g["Rainfall_mm"].to_numpy(),
            "ant3": g["AntecedentRain_3d_mm"].to_numpy(),
            "ant7": g["AntecedentRain_7d_mm"].to_numpy(),
            "ant30": g["AntecedentRain_30d_mm"].to_numpy(),
            "soil": g["SoilMoisture_pct"].to_numpy(),
            "elev": g["Elevation_m"].to_numpy(),
            "tmax": nxt["Tmax_C"].to_numpy(),
            "tmin": nxt["Tmin_C"].to_numpy(),
            "et0": nxt["ET0_mm"].to_numpy(),
            "wl_today": g["WaterLevel_m"].to_numpy(),
            "y_flood": nxt["FloodOccurrence"].to_numpy(),
            "y_wl": nxt["WaterLevel_m"].to_numpy(),
        })[ok])
    out = pd.concat(frames, ignore_index=True)
    out = out.dropna(subset=["y_flood", "y_wl", "rain_next"]).reset_index(drop=True)
    out["y_flood"] = out["y_flood"].astype(int)
    out["month"] = pd.to_datetime(out["target_date"]).dt.month
    out["m_sin"] = np.sin(2 * np.pi * out["month"] / 12)
    out["m_cos"] = np.cos(2 * np.pi * out["month"] / 12)
    return out


def design_matrix(samples: pd.DataFrame) -> np.ndarray:
    cols = [
        samples["rain_next"], samples["rain_today"], samples["ant3"], samples["ant7"],
        samples["ant30"], samples["soil"], samples["tmax"], samples["tmin"],
        samples["m_sin"], samples["m_cos"], samples["elev"],
    ]
    X = np.column_stack([c.to_numpy(dtype=float) for c in cols])
    # City one-hot, reference category is the last (Pasig) via 3 dummies.
    for city in CITY_KEYS[:-1]:
        X = np.column_stack([X, (samples["city"] == city).to_numpy(dtype=float)])
    return X


FEATURE_NAMES = [f["key"] for f in FEATURES] + ["m_sin", "m_cos", "elev"] + [
    f"city={c}" for c in CITY_KEYS[:-1]
]


# ---------------------------------------------------------------------------
# 2. Export: flat-array trees that a 40-line JS evaluator can walk.
# ---------------------------------------------------------------------------
def export_trees(estimators) -> list[dict]:
    trees = []
    for stage in estimators:
        t = stage[0].tree_
        trees.append({
            "f": t.feature.astype(int).tolist(),       # -2 for leaves
            "t": [round(float(x), 6) for x in t.threshold],
            "l": t.children_left.astype(int).tolist(),  # -1 for leaves
            "r": t.children_right.astype(int).tolist(),
            "v": [round(float(x), 8) for x in t.value.reshape(-1)],
        })
    return trees


def tree_sum(trees: list[dict], x: list[float]) -> float:
    """Python twin of the JS evaluator; used to prove the export is faithful."""
    total = 0.0
    for tree in trees:
        node = 0
        while tree["l"][node] != -1:
            node = tree["l"][node] if x[tree["f"][node]] <= tree["t"][node] else tree["r"][node]
        total += tree["v"][node]
    return total


def calibrate_init(trees, lr: float, X: np.ndarray, raw_predict) -> float:
    """Recover the constant init so init + lr*sum(trees) matches the model exactly.

    Deriving it from ``raw_predict`` rather than reading ``init_`` keeps this
    working across scikit-learn versions.
    """
    residuals = [raw_predict(X[i:i + 1])[0] - lr * tree_sum(trees, list(X[i])) for i in range(min(64, len(X)))]
    init = float(np.median(residuals))
    spread = float(np.max(np.abs(np.array(residuals) - init)))
    if spread > 1e-6:
        raise SystemExit(f"tree export is not faithful: residual spread {spread:.2e}")
    return init


# ---------------------------------------------------------------------------
# 3. Metrics
# ---------------------------------------------------------------------------
def classification_metrics(y, p, threshold) -> dict:
    hard = (p >= threshold).astype(int)
    pr, rc, f1, _ = precision_recall_fscore_support(y, hard, average="binary", zero_division=0)
    tn = int(((hard == 0) & (y == 0)).sum())
    fp = int(((hard == 1) & (y == 0)).sum())
    fn = int(((hard == 0) & (y == 1)).sum())
    tp = int(((hard == 1) & (y == 1)).sum())
    return {
        "threshold": round(float(threshold), 4),
        "precision": round(float(pr), 4), "recall": round(float(rc), 4), "f1": round(float(f1), 4),
        "tp": tp, "fp": fp, "fn": fn, "tn": tn,
        "false_alarm_rate": round(fp / (fp + tn), 4) if (fp + tn) else None,
    }


def rule_baselines(samples: pd.DataFrame, te_mask, y) -> list[dict]:
    """Plain thresholds a hydrologist would try before touching a model."""
    positives = int(y.sum()) or 1
    rules = {
        "antecedent 7-day rain >= 150 mm": samples.loc[te_mask, "ant7"] >= 150,
        "forecast rain >= 50 mm": samples.loc[te_mask, "rain_next"] >= 50,
        "dataset rule: rain >= 100 and ant7 >= 150": (
            (samples.loc[te_mask, "rain_next"] >= 100) & (samples.loc[te_mask, "ant7"] >= 150)
        ),
    }
    out = []
    for name, mask in rules.items():
        mask = np.asarray(mask)
        tp = int((mask & (y == 1)).sum())
        fp = int((mask & (y == 0)).sum())
        out.append({
            "name": name,
            "recall": round(tp / positives, 3),
            "precision": round(tp / max(tp + fp, 1), 3),
            "flagged": int(mask.sum()),
        })
    return out


def calibration_bins(y, p, n=5) -> list[dict]:
    order = np.argsort(p)
    splits = np.array_split(order, n)
    rows = []
    for chunk in splits:
        if len(chunk) == 0:
            continue
        rows.append({
            "n": int(len(chunk)),
            "predicted": round(float(p[chunk].mean()), 4),
            "observed": round(float(y[chunk].mean()), 4),
        })
    return rows


def main(argv: list[str]) -> int:
    quiet = "--quiet" in argv
    if not CSV.exists():
        raise SystemExit(f"missing {CSV}; run python3 data/generate_dataset.py first")

    df = pd.read_csv(CSV, parse_dates=["Date"])
    samples = build_samples(df)
    X = design_matrix(samples)
    y_flood = samples["y_flood"].to_numpy()
    y_wl = samples["y_wl"].to_numpy()

    split = samples["split"].to_numpy()
    tr, va, te = split == "train", split == "validation", split == "test"

    clf = GradientBoostingClassifier(
        n_estimators=200, max_depth=3, learning_rate=0.06, subsample=1.0, random_state=SEED,
    ).fit(X[tr], y_flood[tr])
    reg = GradientBoostingRegressor(
        n_estimators=200, max_depth=3, learning_rate=0.08, random_state=SEED,
    ).fit(X[tr], y_wl[tr])

    p_va = clf.predict_proba(X[va])[:, 1]
    p_te = clf.predict_proba(X[te])[:, 1]
    wl_te = reg.predict(X[te])

    # Operating threshold: best F1 on the 2024 validation year, then frozen.
    prec, rec, thresh = precision_recall_curve(y_flood[va], p_va)
    f1s = np.divide(2 * prec * rec, np.clip(prec + rec, 1e-9, None))
    op_threshold = float(thresh[int(np.argmax(f1s[:-1]))])

    metrics = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "dataset": "data/daily_observations.csv (dataset v2)",
        "samples": {
            "total": int(len(samples)),
            "train": int(tr.sum()), "validation": int(va.sum()), "test": int(te.sum()),
            "positives": {"train": int(y_flood[tr].sum()), "validation": int(y_flood[va].sum()),
                          "test": int(y_flood[te].sum())},
            "positive_rate_test": round(float(y_flood[te].mean()), 4),
        },
        "classifier": {
            "average_precision_test": round(float(average_precision_score(y_flood[te], p_te)), 4),
            "roc_auc_test": round(float(roc_auc_score(y_flood[te], p_te)), 4),
            "brier_test": round(float(brier_score_loss(y_flood[te], p_te)), 4),
            "operating_threshold": round(op_threshold, 4),
            "at_operating_threshold_test": classification_metrics(y_flood[te], p_te, op_threshold),
            "at_0.5_test": classification_metrics(y_flood[te], p_te, 0.5),
            "calibration_test": calibration_bins(y_flood[te], p_te),
            "baselines": rule_baselines(samples, te, y_flood[te]),
        },
        "regressor": {
            "mae_test_m": round(float(mean_absolute_error(y_wl[te], wl_te)), 4),
            "rmse_test_m": round(float(math.sqrt(mean_squared_error(y_wl[te], wl_te))), 4),
            "r2_test": round(float(r2_score(y_wl[te], wl_te)), 4),
            "persistence_mae_test_m": round(float(mean_absolute_error(y_wl[te], samples.loc[te, "wl_today"])), 4),
            "per_city_mae_test_m": {
                city: round(float(mean_absolute_error(y_wl[te][(samples.loc[te, "city"] == city).to_numpy()],
                                                     wl_te[(samples.loc[te, "city"] == city).to_numpy()])), 4)
                for city in CITY_KEYS
                if (samples.loc[te, "city"] == city).any()
            },
        },
        "caveat": (
            "WaterLevel_m and FloodOccurrence are derived from Rainfall_mm in dataset v2, so these "
            "scores measure how well the model recovers the generator, not forecast skill. "
            "See docs/ml-methodology.md section 2."
        ),
    }

    # ------------------------------------------------------------------ export
    clf_trees = export_trees(clf.estimators_)
    reg_trees = export_trees(reg.estimators_)
    CLF_LR, REG_LR = 0.06, 0.08
    clf_init = calibrate_init(clf_trees, CLF_LR, X[:64], clf.decision_function)
    reg_init = calibrate_init(reg_trees, REG_LR, X[:64], reg.predict)

    # Round-trip check of the exported form against scikit-learn itself.
    check_idx = np.linspace(0, len(X) - 1, 200).astype(int)
    clf_err = max(abs(clf_init + CLF_LR * tree_sum(clf_trees, list(X[i])) - clf.decision_function(X[i:i + 1])[0])
                  for i in check_idx)
    reg_err = max(abs(reg_init + REG_LR * tree_sum(reg_trees, list(X[i])) - reg.predict(X[i:i + 1])[0])
                  for i in check_idx)

    # Replay examples, all drawn from the held-out test window so nothing the
    # model saw in training is presented as a fresh prediction.
    test_only = samples[te].copy()
    picks = pd.concat([
        test_only.sort_values("y_wl", ascending=False).head(3),
        test_only[test_only["y_flood"] == 0].sort_values("y_wl").head(1),
    ]).drop_duplicates(subset=["city", "target_date"])

    def as_inputs(row):
        return {
            "city": row["city"],
            "rain_next": float(row["rain_next"]), "rain_today": float(row["rain_today"]),
            "ant3": float(row["ant3"]), "ant7": float(row["ant7"]), "ant30": float(row["ant30"]),
            "soil": float(row["soil"]), "tmax": float(row["tmax"]), "tmin": float(row["tmin"]),
            "month": int(row["month"]),
        }

    examples = [
        {
            "label": f"{pd.Timestamp(r['target_date']).strftime('%Y-%m-%d')} · {r['city']}",
            "inputs": as_inputs(r),
            "actual": {"flood": int(r["y_flood"]), "wl": round(float(r["y_wl"]), 2)},
        }
        for _, r in picks.iterrows()
    ]

    et0_by_month = (
        samples.groupby("month")["et0"].mean().round(2).to_dict()
    )
    rain_climatology = (
        samples.groupby(["month", "city"])["rain_next"].mean().round(1).to_dict()
    )

    model = {
        "meta": {
            "name": "RiverGuard test model",
            "version": "0.1.0-test",
            "kind": "GradientBoosting (200 trees, depth 3) x2 — classifier + regressor",
            "trained_at": metrics["generated_at"],
            "dataset": "data/daily_observations.csv (dataset v2, 2016-01-01 → 2026-11-14)",
            "trained_on": "2016-01-01 → 2023-12-31",
            "threshold_tuned_on": "2024 (validation)",
            "evaluated_on": "2025-01-01 → 2026-11-14",
            "target": "t+1 flood occurrence and water level, from day-t state + day-t+1 weather",
            "warning": metrics["caveat"],
            "feature_names": FEATURE_NAMES,
            "learning_rate": {"classifier": CLF_LR, "regressor": REG_LR},
            "init": {"classifier": round(clf_init, 8), "regressor": round(reg_init, 8)},
            "export_check": {"classifier_max_abs_diff": clf_err, "regressor_max_abs_diff": reg_err},
        },
        "features": FEATURES,
        "cities": CITIES,
        "city_order": CITY_KEYS,
        "operating_threshold": round(op_threshold, 4),
        "et0_by_month": {str(k): v for k, v in et0_by_month.items()},
        "rain_climatology": {f"{m}|{c}": v for (m, c), v in rain_climatology.items()},
        "metrics": metrics,
        "examples": examples,
        "classifier": {"trees": clf_trees},
        "regressor": {"trees": reg_trees},
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "model.json").write_text(json.dumps(model, separators=(",", ":")))
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))

    if not quiet:
        c, r = metrics["classifier"], metrics["regressor"]
        print(f"samples        {metrics['samples']['total']} "
              f"(train {metrics['samples']['train']} / val {metrics['samples']['validation']} / test {metrics['samples']['test']})")
        print(f"positive rate  {metrics['samples']['positive_rate_test']:.2%} in test")
        print(f"classifier     AP {c['average_precision_test']:.3f} · ROC-AUC {c['roc_auc_test']:.3f} · Brier {c['brier_test']:.4f}")
        op = c["at_operating_threshold_test"]
        print(f"  @{op['threshold']:.3f}   P {op['precision']:.2f} R {op['recall']:.2f} F1 {op['f1']:.2f} "
              f"(tp {op['tp']} fp {op['fp']} fn {op['fn']})")
        print(f"  calibration    " + " | ".join(f"{b['predicted']:.3f}→{b['observed']:.3f}" for b in c["calibration_test"]))
        print(f"regressor      MAE {r['mae_test_m']:.3f} m · RMSE {r['rmse_test_m']:.3f} m · R² {r['r2_test']:.3f}")
        print(f"  persistence  MAE {r['persistence_mae_test_m']:.3f} m (must beat this)")
        print(f"export check   clf {clf_err:.2e} · reg {reg_err:.2e}")
        print(f"wrote          {OUT/'model.json'} ({(OUT/'model.json').stat().st_size/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
