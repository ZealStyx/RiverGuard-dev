"""Turns observed conditions plus a daily weather forecast into model inputs.

The model predicts day t+1 from the state at the end of day t. When several days
are forecast, each day's rain updates the antecedent sums and the soil-moisture
bucket before the next day is predicted — the same recurrence the generator in
``data/generate_dataset.py`` uses, so the chain stays consistent with the data
the model was trained on.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

from app.services.model_runtime import ModelRuntime

# Antecedent windows, in days, as stored in dataset v2.
ANTECEDENT_WINDOWS = (3, 7, 30)
BUFFER_DAYS = 30
SOIL_MIN, SOIL_MAX = 5.0, 95.0
SOIL_DRAINAGE = 0.08


@dataclass
class ObservedState:
    """Everything the model knows about "now", before tomorrow's weather."""

    rainfall_today_mm: float
    antecedent_3d_mm: float
    antecedent_7d_mm: float
    antecedent_30d_mm: float
    soil_moisture_percent: float

    def normalised(self) -> "ObservedState":
        ant3 = max(0.0, self.antecedent_3d_mm)
        ant7 = max(ant3, self.antecedent_7d_mm)
        ant30 = max(ant7, self.antecedent_30d_mm)
        return ObservedState(
            rainfall_today_mm=max(0.0, self.rainfall_today_mm),
            antecedent_3d_mm=ant3,
            antecedent_7d_mm=ant7,
            antecedent_30d_mm=ant30,
            soil_moisture_percent=clamp(self.soil_moisture_percent, SOIL_MIN, SOIL_MAX),
        )


@dataclass
class DailyWeather:
    date: date
    rainfall_mm: float
    tmax_c: float
    tmin_c: float
    #: Provider ET0 for this day, when it sent one. `None` means "use the month's
    #: normal" — see `forecasting._et0_for`.
    et0_mm: float | None = None


@dataclass
class AntecedentBuffer:
    """A 30-day ring of daily rainfall, seeded from the three antecedent sums.

    Daily data gives us three overlapping totals rather than the raw series, so
    the earlier days are filled from the totals themselves: the last three days
    share the 3-day sum, days 4-7 share the remainder of the 7-day sum, and
    days 8-30 share the remainder of the 30-day sum. Advancing then reproduces
    the real rolling sums for every day after the first.
    """

    days: list[float] = field(default_factory=list)

    @classmethod
    def seed(cls, state: ObservedState) -> "AntecedentBuffer":
        state = state.normalised()
        older = max(0.0, (state.antecedent_30d_mm - state.antecedent_7d_mm) / (BUFFER_DAYS - 7))
        mid = max(0.0, (state.antecedent_7d_mm - state.antecedent_3d_mm) / 4)
        recent = max(0.0, state.antecedent_3d_mm / 3)
        return cls(days=[older] * 23 + [mid] * 4 + [recent] * 3)

    def push(self, rainfall_mm: float) -> None:
        self.days.append(max(0.0, rainfall_mm))
        if len(self.days) > BUFFER_DAYS:
            self.days.pop(0)

    def window(self, days: int) -> float:
        return sum(self.days[-days:])


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def advance_soil_moisture(soil_percent: float, rainfall_mm: float, et0_mm: float) -> float:
    """One step of the bucket used by the dataset generator."""
    return clamp(soil_percent + rainfall_mm - et0_mm - SOIL_DRAINAGE * soil_percent, SOIL_MIN, SOIL_MAX)


def build_inputs(
    state: ObservedState,
    weather: DailyWeather,
    runtime: ModelRuntime,
    month: int,
) -> dict[str, float]:
    return {
        "rain_next": max(0.0, weather.rainfall_mm),
        "rain_today": max(0.0, state.rainfall_today_mm),
        "ant3": state.antecedent_3d_mm,
        "ant7": state.antecedent_7d_mm,
        "ant30": state.antecedent_30d_mm,
        "soil": state.soil_moisture_percent,
        "tmax": weather.tmax_c,
        "tmin": weather.tmin_c,
        # month is used to build the seasonal sine/cosine pair inside the runtime
        "_month": float(month),
    }


def tomorrow_of(issue_day: date) -> date:
    return issue_day + timedelta(days=1)
