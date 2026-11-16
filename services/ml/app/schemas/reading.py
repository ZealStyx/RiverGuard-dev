"""Observed conditions and daily weather, as supplied by the forecast pipeline."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field, model_validator


class ObservedConditions(BaseModel):
    """State at the end of the issue day. Mirrors the dataset's antecedent columns."""

    model_config = {"extra": "forbid"}

    rainfallTodayMm: float = Field(ge=0, le=1000)
    antecedentRain3dMm: float = Field(ge=0, le=2500)
    antecedentRain7dMm: float = Field(ge=0, le=3000)
    antecedentRain30dMm: float = Field(ge=0, le=5000)
    soilMoisturePercent: float = Field(ge=0, le=100)

    @model_validator(mode="after")
    def windows_nest(self) -> "ObservedConditions":
        if not self.antecedentRain3dMm <= self.antecedentRain7dMm <= self.antecedentRain30dMm:
            raise ValueError(
                "antecedent windows must nest: 3-day <= 7-day <= 30-day totals"
            )
        return self


class DailyWeatherInput(BaseModel):
    model_config = {"extra": "forbid"}

    date: date
    rainfallMm: float = Field(ge=0, le=600, description="Daily total for this date.")
    tmaxC: float = Field(ge=10, le=45)
    tminC: float = Field(ge=10, le=45)

    @model_validator(mode="after")
    def min_below_max(self) -> "DailyWeatherInput":
        if self.tminC > self.tmaxC:
            raise ValueError("tminC must not exceed tmaxC")
        return self
