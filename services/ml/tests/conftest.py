from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def observed() -> dict:
    """A wet November evening in Marikina, below alarm levels."""
    return {
        "rainfallTodayMm": 12,
        "antecedentRain3dMm": 50,
        "antecedentRain7dMm": 120,
        "antecedentRain30dMm": 270,
        "soilMoisturePercent": 66,
    }


@pytest.fixture
def week() -> list[dict]:
    """Seven consecutive days starting 2026-11-16, settled weather."""
    rain = [46, 5, 4, 6, 5, 3, 2]
    return [
        {
            "date": date(2026, 11, 16 + offset).isoformat(),
            "rainfallMm": value,
            "tmaxC": 31.0,
            "tminC": 25.0,
        }
        for offset, value in enumerate(rain)
    ]
