"""Location contracts. Alarm levels come from the model export, not the request."""
from __future__ import annotations

from pydantic import BaseModel, Field


class CityOut(BaseModel):
    code: str = Field(description="Slug used across Convex and the web app, e.g. 'marikina'.")
    name: str
    river: str
    latitude: float
    longitude: float
    elevationM: float
    alarmLevelsM: tuple[float, float, float] = Field(
        description="First, second and third alarm levels in metres."
    )
    alarmsVerified: bool = Field(
        description="False when the alarm levels are representative or indicative rather than documented."
    )


class CitiesResponse(BaseModel):
    cities: list[CityOut]
    modelVersion: str
    warning: str
