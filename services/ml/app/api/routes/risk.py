"""Risk assessment endpoint: one day, one location, with reasons."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.risk import ContributionOut, RiskRequest, RiskResponse
from app.services.explainability import contributions
from app.services.feature_engineering import DailyWeather, ObservedState, build_inputs
from app.services.model_runtime import ModelNotLoadedError, load_model
from app.services.risk_classification import assess

router = APIRouter(prefix="/v1/risk", tags=["risk"])


@router.post("/assess", response_model=RiskResponse)
def assess_risk(request: RiskRequest) -> RiskResponse:
    try:
        runtime = load_model(settings.model_path)
    except ModelNotLoadedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        city = runtime.city(request.locationCode)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    observed = ObservedState(
        rainfall_today_mm=request.observed.rainfallTodayMm,
        antecedent_3d_mm=request.observed.antecedentRain3dMm,
        antecedent_7d_mm=request.observed.antecedentRain7dMm,
        antecedent_30d_mm=request.observed.antecedentRain30dMm,
        soil_moisture_percent=request.observed.soilMoisturePercent,
    ).normalised()
    weather = DailyWeather(
        date=request.weather.date,
        rainfall_mm=request.weather.rainfallMm,
        tmax_c=request.weather.tmaxC,
        tmin_c=request.weather.tminC,
    )

    inputs = build_inputs(observed, weather, runtime, weather.date.month)
    prediction = runtime.predict(inputs, city.code, weather.date.month)
    assessment = assess(
        probability=prediction.probability,
        water_level_m=prediction.water_level_m,
        alarm_levels_m=city.alarm_levels_m,
        operating_threshold=runtime.operating_threshold,
    )
    ranking = contributions(runtime, inputs, city.code, weather.date.month)

    return RiskResponse(
        locationCode=city.code,
        locationName=city.name,
        date=weather.date,
        probability=round(prediction.probability, 6),
        waterLevelM=round(prediction.water_level_m, 3),
        riskLevel=assessment.risk_level,
        alertLevel=assessment.alert_level,
        exceedsOperatingThreshold=assessment.exceeds_operating_threshold,
        reasons=assessment.reasons,
        contributions=[
            ContributionOut(
                key=row.key,
                label=row.label,
                deltaProbability=row.delta_probability,
                deltaWaterLevelM=row.delta_water_level_m,
            )
            for row in ranking
        ],
        modelVersion=runtime.version,
        operatingThreshold=runtime.operating_threshold,
        warning=runtime.warning,
    )
