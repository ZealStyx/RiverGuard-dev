"""Risk assessment contracts."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.reading import DailyWeatherInput, ObservedConditions


class RiskRequest(BaseModel):
    model_config = {"extra": "forbid"}

    locationCode: str
    issueDate: date
    observed: ObservedConditions
    weather: DailyWeatherInput


class ContributionOut(BaseModel):
    key: str
    label: str
    deltaProbability: float = Field(
        description=(
            "Change in probability when this input moves from its low to its high end, with "
            "everything else fixed. Sensitivity, not a SHAP attribution."
        )
    )
    deltaWaterLevelM: float


class RiskResponse(BaseModel):
    locationCode: str
    locationName: str
    date: date
    probability: float = Field(ge=0, le=1)
    waterLevelM: float
    riskLevel: Literal["lower", "moderate", "elevated", "unavailable"]
    alertLevel: Literal["none", "first", "second", "third"]
    exceedsOperatingThreshold: bool
    reasons: list[str]
    contributions: list[ContributionOut]
    modelVersion: str
    operatingThreshold: float
    warning: str
