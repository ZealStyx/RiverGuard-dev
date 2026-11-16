"""Liveness and readiness. `/health` is cheap; `/health/ready` touches the model file."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Response, status

from app.core.config import settings
from app.schemas.station import CitiesResponse, CityOut
from app.services.model_runtime import ModelNotLoadedError, load_model, model_loaded_at

router = APIRouter(tags=["health"])


def _city_payload(runtime) -> list[CityOut]:
    return [
        CityOut(
            code=city.code,
            name=city.name,
            river=city.river,
            latitude=city.latitude,
            longitude=city.longitude,
            elevationM=city.elevation_m,
            alarmLevelsM=city.alarm_levels_m,
            alarmsVerified=city.alarms_verified,
        )
        for city in runtime.cities.values()
    ]


@router.get("/health")
def health() -> dict:
    """Process is up. Does not prove the model loaded."""
    return {
        "status": "ok",
        "service": settings.service_name,
        "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "featureSchemaVersion": settings.feature_schema_version,
        "modelFile": str(settings.model_path),
        "modelFilePresent": settings.model_exists,
    }


@router.get("/health/ready")
def ready(response: Response) -> dict:
    """Ready to serve predictions: the model artifact exists and parses."""
    try:
        runtime = load_model(settings.model_path)
    except ModelNotLoadedError as exc:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unavailable", "detail": str(exc)}

    metrics = runtime.metrics
    return {
        "status": "ready",
        "service": settings.service_name,
        "model": {
            "version": runtime.version,
            "kind": runtime.kind,
            "loadedAt": model_loaded_at(settings.model_path),
            "operatingThreshold": runtime.operating_threshold,
            "testMetrics": {
                "averagePrecision": metrics["classifier"]["average_precision_test"],
                "waterLevelMaeM": metrics["regressor"]["mae_test_m"],
            },
        },
        "cities": [city.code for city in runtime.cities.values()],
        "warning": runtime.warning,
    }


@router.get("/v1/cities", response_model=CitiesResponse)
def cities() -> CitiesResponse:
    """Supported locations with their alarm levels, straight from the model export."""
    runtime = load_model(settings.model_path)
    return CitiesResponse(
        cities=_city_payload(runtime),
        modelVersion=runtime.version,
        warning=runtime.warning,
    )
