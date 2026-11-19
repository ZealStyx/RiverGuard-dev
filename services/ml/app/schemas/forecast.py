"""Request and response contracts for the daily forecast endpoints."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.reading import DailyWeatherInput, ObservedConditions
from app.schemas.risk import ContributionOut


class ForecastRequest(BaseModel):
    model_config = {"extra": "forbid"}

    locationCode: str = Field(description="One of the supported city slugs, e.g. 'marikina'.")
    issueDate: date = Field(description="Day on which the forecast is issued; day 1 is issueDate + 1.")
    observed: ObservedConditions
    days: list[DailyWeatherInput] = Field(min_length=1, max_length=14)

    @model_validator(mode="after")
    def days_are_in_order(self) -> "ForecastRequest":
        dates = [day.date for day in self.days]
        if dates != sorted(dates):
            raise ValueError("days must be supplied in ascending date order")
        if len(set(dates)) != len(dates):
            raise ValueError("days must not repeat a date")
        return self


class DailyForecastOut(BaseModel):
    date: date
    horizonDays: int
    rainfallMm: float
    probability: float = Field(ge=0, le=1)
    waterLevelM: float
    riskLevel: Literal["lower", "moderate", "elevated", "unavailable"]
    alertLevel: Literal["none", "first", "second", "third"]
    exceedsOperatingThreshold: bool
    antecedentRain3dMm: float
    antecedentRain7dMm: float
    antecedentRain30dMm: float
    soilMoisturePercent: float
    reasons: list[str]


class ForecastMeta(BaseModel):
    modelVersion: str
    modelKind: str
    operatingThreshold: float
    featureSchemaVersion: str
    generatedAt: datetime
    warning: str
    alarms: list[float]
    alarmsVerified: bool


class ForecastResponse(BaseModel):
    locationCode: str
    locationName: str
    meta: ForecastMeta
    days: list[DailyForecastOut]


class SingleDayForecastResponse(BaseModel):
    locationCode: str
    locationName: str
    meta: ForecastMeta
    day: DailyForecastOut
    contributions: list[ContributionOut]


__all__ = [
    "ContributionOut",
    "DailyForecastOut",
    "ForecastMeta",
    "ForecastRequest",
    "ForecastResponse",
    "SingleDayForecastResponse",
]
