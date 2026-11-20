"""Daily forecast chain: state → weather → probability + water level, repeated."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.services.feature_engineering import (
    AntecedentBuffer,
    DailyWeather,
    ObservedState,
    advance_soil_moisture,
    build_inputs,
)
from app.services.model_runtime import ModelRuntime
from app.services.risk_classification import RiskAssessment, assess


@dataclass(frozen=True)
class DailyForecast:
    date: date
    rainfall_mm: float
    probability: float
    water_level_m: float
    antecedent_3d_mm: float
    antecedent_7d_mm: float
    antecedent_30d_mm: float
    soil_moisture_percent: float
    assessment: RiskAssessment


@dataclass(frozen=True)
class ForecastChain:
    location_code: str
    model_version: str
    operating_threshold: float
    days: list[DailyForecast]


def _et0_for(weather: DailyWeather, runtime: ModelRuntime) -> float:
    """Evapotranspiration to drain the soil bucket by, for this day.

    The bucket is the generator's: ``SM_t = SM_{t-1} + rain - ET0 - 0.08*SM_{t-1}``.
    Rain was always applied, but ET0 was a monthly normal, so a cloudless week and
    an overcast week dried the catchment identically — and the horizon drifted away
    from the observed day, whose soil was warmed up with the provider's real ET0.
    Now the provider's own figure wins whenever it is present, and the monthly
    normal is only the fallback for a caller that sends none.
    """
    if weather.et0_mm is not None:
        return max(0.0, float(weather.et0_mm))
    return runtime.et0_for(weather.date.month)


def run_chain(
    runtime: ModelRuntime,
    location_code: str,
    observed: ObservedState,
    weather_days: list[DailyWeather],
) -> ForecastChain:
    """Predict every supplied day, carrying soil moisture and antecedent rain forward."""
    city = runtime.city(location_code)
    state = observed.normalised()
    buffer = AntecedentBuffer.seed(state)
    soil = state.soil_moisture_percent

    forecasts: list[DailyForecast] = []
    for index, weather in enumerate(weather_days):
        if index > 0:
            # Fold the previous day's forecast rain into the antecedent sums.
            # The buffer is seeded from the observed totals, so this reproduces
            # the rolling sums the model was trained on.
            state = ObservedState(
                rainfall_today_mm=weather_days[index - 1].rainfall_mm,
                antecedent_3d_mm=buffer.window(3),
                antecedent_7d_mm=buffer.window(7),
                antecedent_30d_mm=buffer.window(30),
                soil_moisture_percent=soil,
            )
        inputs = build_inputs(state, weather, runtime, weather.date.month)
        prediction = runtime.predict(inputs, location_code, weather.date.month)
        assessment = assess(
            probability=prediction.probability,
            water_level_m=prediction.water_level_m,
            alarm_levels_m=city.alarm_levels_m,
            operating_threshold=runtime.operating_threshold,
        )
        forecasts.append(
            DailyForecast(
                date=weather.date,
                rainfall_mm=max(0.0, weather.rainfall_mm),
                probability=prediction.probability,
                water_level_m=prediction.water_level_m,
                antecedent_3d_mm=state.antecedent_3d_mm,
                antecedent_7d_mm=state.antecedent_7d_mm,
                antecedent_30d_mm=state.antecedent_30d_mm,
                soil_moisture_percent=state.soil_moisture_percent,
                assessment=assessment,
            )
        )
        # Advance the shared state for the next day in the chain.
        buffer.push(weather.rainfall_mm)
        soil = advance_soil_moisture(soil, weather.rainfall_mm, _et0_for(weather, runtime))

    return ForecastChain(
        location_code=location_code,
        model_version=runtime.version,
        operating_threshold=runtime.operating_threshold,
        days=forecasts,
    )


def next_day_weather(issue_day: date, weather_days: list[DailyWeather]) -> DailyWeather | None:
    """The first forecast day on or after tomorrow, used by the risk endpoint."""
    from datetime import timedelta

    target = issue_day + timedelta(days=1)
    for day in weather_days:
        if day.date >= target:
            return day
    return None
