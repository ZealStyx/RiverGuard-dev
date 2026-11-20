"""Daily forecast endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.forecast import (
    DailyForecastOut,
    ForecastMeta,
    ForecastRequest,
    ForecastResponse,
    SingleDayForecastResponse,
)
from app.schemas.risk import ContributionOut
from app.services.explainability import contributions
from app.services.feature_engineering import DailyWeather, ObservedState, build_inputs
from app.services.forecasting import run_chain
from app.services.model_runtime import ModelNotLoadedError, load_model

router = APIRouter(prefix="/v1/forecast", tags=["forecast"])


def _runtime_or_503():
    try:
        return load_model(settings.model_path)
    except ModelNotLoadedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _meta(runtime, city) -> ForecastMeta:
    return ForecastMeta(
        modelVersion=runtime.version,
        modelKind=runtime.kind,
        operatingThreshold=runtime.operating_threshold,
        featureSchemaVersion=settings.feature_schema_version,
        generatedAt=datetime.now(timezone.utc),
        warning=runtime.warning,
        alarms=list(city.alarm_levels_m),
        alarmsVerified=city.alarms_verified,
    )


@router.post("/daily", response_model=ForecastResponse)
def daily_forecast(request: ForecastRequest) -> ForecastResponse:
    """Predict every supplied day, chaining antecedent rain and soil moisture forward."""
    runtime = _runtime_or_503()
    try:
        city = runtime.city(request.locationCode)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if len(request.days) > settings.max_forecast_days:
        raise HTTPException(
            status_code=422,
            detail=f"at most {settings.max_forecast_days} forecast days are supported",
        )

    observed = ObservedState(
        rainfall_today_mm=request.observed.rainfallTodayMm,
        antecedent_3d_mm=request.observed.antecedentRain3dMm,
        antecedent_7d_mm=request.observed.antecedentRain7dMm,
        antecedent_30d_mm=request.observed.antecedentRain30dMm,
        soil_moisture_percent=request.observed.soilMoisturePercent,
    )
    weather_days = [
        DailyWeather(
            date=day.date,
            rainfall_mm=day.rainfallMm,
            tmax_c=day.tmaxC,
            tmin_c=day.tminC,
            et0_mm=day.et0Mm,
        )
        for day in request.days
    ]

    chain = run_chain(runtime, city.code, observed, weather_days)
    days = [
        DailyForecastOut(
            date=forecast.date,
            horizonDays=index + 1,
            rainfallMm=round(forecast.rainfall_mm, 1),
            probability=round(forecast.probability, 6),
            waterLevelM=round(forecast.water_level_m, 3),
            riskLevel=forecast.assessment.risk_level,
            alertLevel=forecast.assessment.alert_level,
            exceedsOperatingThreshold=forecast.assessment.exceeds_operating_threshold,
            antecedentRain3dMm=round(forecast.antecedent_3d_mm, 1),
            antecedentRain7dMm=round(forecast.antecedent_7d_mm, 1),
            antecedentRain30dMm=round(forecast.antecedent_30d_mm, 1),
            soilMoisturePercent=round(forecast.soil_moisture_percent, 1),
            reasons=forecast.assessment.reasons,
        )
        for index, forecast in enumerate(chain.days)
    ]

    return ForecastResponse(
        locationCode=city.code,
        locationName=city.name,
        meta=_meta(runtime, city),
        days=days,
    )


@router.post("/next-day", response_model=SingleDayForecastResponse)
def next_day(request: ForecastRequest) -> SingleDayForecastResponse:
    """One day, plus the sensitivity ranking that explains it."""
    runtime = _runtime_or_503()
    try:
        city = runtime.city(request.locationCode)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    full = daily_forecast(request)
    first = request.days[0]
    observed = ObservedState(
        rainfall_today_mm=request.observed.rainfallTodayMm,
        antecedent_3d_mm=request.observed.antecedentRain3dMm,
        antecedent_7d_mm=request.observed.antecedentRain7dMm,
        antecedent_30d_mm=request.observed.antecedentRain30dMm,
        soil_moisture_percent=request.observed.soilMoisturePercent,
    ).normalised()
    weather = DailyWeather(
        date=first.date,
        rainfall_mm=first.rainfallMm,
        tmax_c=first.tmaxC,
        tmin_c=first.tminC,
        et0_mm=first.et0Mm,
    )
    inputs = build_inputs(observed, weather, runtime, first.date.month)
    ranking = contributions(runtime, inputs, city.code, first.date.month)

    return SingleDayForecastResponse(
        locationCode=city.code,
        locationName=city.name,
        meta=_meta(runtime, city),
        day=full.days[0],
        contributions=[
            ContributionOut(
                key=row.key,
                label=row.label,
                deltaProbability=row.delta_probability,
                deltaWaterLevelM=row.delta_water_level_m,
            )
            for row in ranking
        ],
    )
