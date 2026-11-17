"""Reads the real NCR dataset so the model is driven by observations, not fixtures.

The forecast pipeline used to receive its "observed" state from a hard-coded
weather fixture whenever the online provider was unreachable. That is the wrong
default: dataset v2 already contains an observed antecedent state for every city
and every day, including the real ERA5 rainfall tail. This module exposes those
rows over HTTP so the Next.js route handler can build model inputs from the CSV
whenever live weather is unavailable, and so the UI can chart real history.

Column names and their provenance are documented in ``data/README.md``.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Mapping

from app.core.config import REPO_ROOT

DATASET_RELATIVE = Path("data") / "daily_observations.csv"

#: Columns this service reads. Anything else in the CSV is ignored.
NUMERIC_COLUMNS = (
    "Latitude",
    "Longitude",
    "Elevation_m",
    "Rainfall_mm",
    "Tmax_C",
    "Tmin_C",
    "ET0_mm",
    "SoilMoisture_pct",
    "AntecedentRain_3d_mm",
    "AntecedentRain_7d_mm",
    "AntecedentRain_30d_mm",
    "WaterLevel_m",
    "WaterLevel_Change_24h_m",
    "FloodOccurrence",
)


class DatasetUnavailableError(RuntimeError):
    """Raised when the CSV is missing or unreadable."""


@dataclass(frozen=True)
class Observation:
    date: date
    location: str
    station_id: str
    latitude: float | None
    longitude: float | None
    elevation_m: float | None
    rainfall_mm: float | None
    tmax_c: float | None
    tmin_c: float | None
    et0_mm: float | None
    soil_moisture_pct: float | None
    antecedent_3d_mm: float | None
    antecedent_7d_mm: float | None
    antecedent_30d_mm: float | None
    water_level_m: float | None
    water_level_change_24h_m: float | None
    flood_occurrence: int | None
    risk_level: str
    rain_source: str
    split: str
    data_source: str
    quality_status: str

    def as_dict(self) -> dict[str, object]:
        return {
            "date": self.date.isoformat(),
            "location": self.location,
            "stationId": self.station_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "elevationM": self.elevation_m,
            "rainfallMm": self.rainfall_mm,
            "tmaxC": self.tmax_c,
            "tminC": self.tmin_c,
            "et0Mm": self.et0_mm,
            "soilMoisturePct": self.soil_moisture_pct,
            "antecedentRain3dMm": self.antecedent_3d_mm,
            "antecedentRain7dMm": self.antecedent_7d_mm,
            "antecedentRain30dMm": self.antecedent_30d_mm,
            "waterLevelM": self.water_level_m,
            "waterLevelChange24hM": self.water_level_change_24h_m,
            "floodOccurrence": self.flood_occurrence,
            "riskLevel": self.risk_level,
            "rainSource": self.rain_source,
            "split": self.split,
            "dataSource": self.data_source,
            "qualityStatus": self.quality_status,
        }


def _number(raw: str | None) -> float | None:
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _integer(raw: str | None) -> int | None:
    value = _number(raw)
    return None if value is None else int(value)


def dataset_path() -> Path:
    return REPO_ROOT / DATASET_RELATIVE


@lru_cache(maxsize=4)
def _load(path: Path, stamp: float) -> tuple[list[Observation], dict[str, list[Observation]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise DatasetUnavailableError(f"{path} has no header row")
        rows: list[Observation] = []
        for raw in reader:
            iso = (raw.get("Date") or "").strip()
            if not iso:
                continue
            try:
                observed_on = date.fromisoformat(iso)
            except ValueError:
                continue
            rows.append(
                Observation(
                    date=observed_on,
                    location=(raw.get("Location") or "").strip(),
                    station_id=(raw.get("Station_ID") or "").strip(),
                    latitude=_number(raw.get("Latitude")),
                    longitude=_number(raw.get("Longitude")),
                    elevation_m=_number(raw.get("Elevation_m")),
                    rainfall_mm=_number(raw.get("Rainfall_mm")),
                    tmax_c=_number(raw.get("Tmax_C")),
                    tmin_c=_number(raw.get("Tmin_C")),
                    et0_mm=_number(raw.get("ET0_mm")),
                    soil_moisture_pct=_number(raw.get("SoilMoisture_pct")),
                    antecedent_3d_mm=_number(raw.get("AntecedentRain_3d_mm")),
                    antecedent_7d_mm=_number(raw.get("AntecedentRain_7d_mm")),
                    antecedent_30d_mm=_number(raw.get("AntecedentRain_30d_mm")),
                    water_level_m=_number(raw.get("WaterLevel_m")),
                    water_level_change_24h_m=_number(raw.get("WaterLevel_Change_24h_m")),
                    flood_occurrence=_integer(raw.get("FloodOccurrence")),
                    risk_level=(raw.get("RiskLevel") or "").strip(),
                    rain_source=(raw.get("RainSource") or "").strip(),
                    split=(raw.get("Split") or "").strip(),
                    data_source=(raw.get("DataSource") or "").strip(),
                    quality_status=(raw.get("QualityStatus") or "").strip(),
                )
            )

    rows.sort(key=lambda row: (row.location, row.date))
    grouped: dict[str, list[Observation]] = {}
    for row in rows:
        grouped.setdefault(slug(row.location), []).append(row)
    return rows, grouped


def slug(value: str) -> str:
    return value.strip().lower().replace(" ", "-")


def dataset() -> tuple[list[Observation], dict[str, list[Observation]]]:
    path = dataset_path()
    if not path.is_file():
        raise DatasetUnavailableError(
            f"dataset not found at {path}; regenerate it with `python data/generate_dataset.py`"
        )
    return _load(path, path.stat().st_mtime)


def series(location: str) -> list[Observation]:
    _, grouped = dataset()
    return grouped.get(slug(location), [])


def latest(location: str) -> Observation | None:
    rows = series(location)
    return rows[-1] if rows else None


def observations_between(
    location: str, start: date | None, end: date | None, limit: int
) -> list[Observation]:
    rows: Iterable[Observation] = series(location)
    if start is not None:
        rows = [row for row in rows if row.date >= start]
    if end is not None:
        rows = [row for row in rows if row.date <= end]
    materialised = list(rows)
    return materialised[-limit:] if limit else materialised


def monthly_totals(location: str, months: int = 24) -> list[dict[str, object]]:
    totals: dict[str, dict[str, float]] = {}
    for row in series(location):
        key = row.date.strftime("%Y-%m")
        bucket = totals.setdefault(key, {"rainfallMm": 0.0, "floodDays": 0.0})
        bucket["rainfallMm"] += row.rainfall_mm or 0.0
        if (row.flood_occurrence or 0) >= 1:
            bucket["floodDays"] += 1
    ordered = sorted(totals.items())[-months:]
    return [
        {
            "month": month,
            "rainfallMm": round(values["rainfallMm"], 1),
            "floodDays": int(values["floodDays"]),
        }
        for month, values in ordered
    ]


def dataset_meta() -> dict[str, object]:
    rows, grouped = dataset()
    if not rows:
        raise DatasetUnavailableError("dataset has no rows")
    dates = [row.date for row in rows]
    sources = sorted({row.rain_source for row in rows if row.rain_source})
    # Continuous real reanalysis only. `ERA5-anchor` marks two isolated rows
    # inside the synthetic era (the 2020 Ulysses event), so including it here
    # would date the provenance switch to 2020 and mislabel ten years of data.
    real = sorted(row.date for row in rows if row.rain_source == "ERA5-reanalysis")
    return {
        "label": "RiverGuard NCR Dataset v2",
        "file": str(DATASET_RELATIVE),
        "rows": len(rows),
        "locations": sorted({row.location for row in rows}),
        "dateMin": min(dates).isoformat(),
        "dateMax": max(dates).isoformat(),
        "realRainFrom": real[0].isoformat() if real else None,
        "rainSources": sources,
        "loadedAt": datetime.now().isoformat(timespec="seconds"),
    }


def observed_state_payload(location: str) -> Mapping[str, object] | None:
    """The model's observed inputs, taken from the dataset's own columns.

    Returns ``None`` when the location has no rows. The antecedent columns are
    already shifted by one day in the dataset (no target leakage), which is
    exactly the contract ``ObservedConditions`` expects.
    """
    row = latest(location)
    if row is None:
        return None
    return {
        "asOfDate": row.date.isoformat(),
        "locationCode": slug(row.location),
        "location": row.location,
        "rainfallTodayMm": row.rainfall_mm or 0.0,
        "antecedentRain3dMm": row.antecedent_3d_mm or 0.0,
        "antecedentRain7dMm": row.antecedent_7d_mm or 0.0,
        "antecedentRain30dMm": row.antecedent_30d_mm or 0.0,
        "soilMoisturePercent": row.soil_moisture_pct or 0.0,
        "waterLevelM": row.water_level_m,
        "rainSource": row.rain_source,
        "qualityStatus": row.quality_status,
    }
