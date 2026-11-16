"""Contribution estimates that do not pretend to be causal.

There is no SHAP implementation here, and claiming one without the library
would be worse than useless. Instead each numeric input is pushed to the ends of
its plausible range with everything else fixed, and the resulting change in
probability is reported. That answers the question a reader actually asks —
"what is driving this number?" — while staying honest about being a local
sensitivity, not an attribution.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from app.services.model_runtime import ModelRuntime

# Plausible domain per input, used for the sweep. Values match the sliders in
# ml/predictor.html so the two explanations agree.
RANGES: dict[str, tuple[float, float]] = {
    "rain_next": (0.0, 400.0),
    "rain_today": (0.0, 400.0),
    "ant3": (0.0, 700.0),
    "ant7": (0.0, 1000.0),
    "ant30": (0.0, 2000.0),
    "soil": (5.0, 95.0),
    "tmax": (22.0, 40.0),
    "tmin": (18.0, 30.0),
}

LABELS = {
    "rain_next": "Forecast rain tomorrow",
    "rain_today": "Rain so far today",
    "ant3": "Rain, previous 3 days",
    "ant7": "Rain, previous 7 days",
    "ant30": "Rain, previous 30 days",
    "soil": "Soil moisture",
    "tmax": "Max temperature tomorrow",
    "tmin": "Min temperature tomorrow",
}


@dataclass(frozen=True)
class Contribution:
    key: str
    label: str
    delta_probability: float
    delta_water_level_m: float


def contributions(
    runtime: ModelRuntime,
    inputs: Mapping[str, float],
    location_code: str,
    month: int,
    limit: int = 5,
) -> list[Contribution]:
    rows: list[Contribution] = []
    for key, (low, high) in RANGES.items():
        if key not in inputs:
            continue
        at_low = runtime.predict({**inputs, key: low}, location_code, month)
        at_high = runtime.predict({**inputs, key: high}, location_code, month)
        rows.append(
            Contribution(
                key=key,
                label=LABELS[key],
                delta_probability=round(at_high.probability - at_low.probability, 6),
                delta_water_level_m=round(at_high.water_level_m - at_low.water_level_m, 4),
            )
        )
    rows.sort(key=lambda row: abs(row.delta_probability), reverse=True)
    return rows[:limit]
