"""Loads the exported gradient-boosted trees and evaluates them in pure Python.

The export in ``ml/artifacts/model.json`` is produced by
``ml/train_test_model.py``. Each tree is stored as parallel flat arrays, so
inference needs no scikit-learn at runtime — the same arrays are read by
``ml/predictor.html`` in the browser, which is why the two paths agree exactly.

Nothing here is a validated forecasting model: the targets in dataset v2 are
derived from rainfall, so predictions reproduce the generator that produced
them. See ``docs/ml-methodology.md`` section 2.
"""
from __future__ import annotations

import json
import math
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

# Feature order is frozen by the trainer; see FEATURES in ml/train_test_model.py.
NUMERIC_FEATURES = (
    "rain_next",
    "rain_today",
    "ant3",
    "ant7",
    "ant30",
    "soil",
    "tmax",
    "tmin",
)
DERIVED_FEATURES = ("m_sin", "m_cos", "elev")


class ModelNotLoadedError(RuntimeError):
    """Raised when the service is asked to predict without a model artifact."""


@dataclass(frozen=True)
class CityConfig:
    code: str
    name: str
    river: str
    latitude: float
    longitude: float
    elevation_m: float
    alarm_levels_m: tuple[float, float, float]
    alarms_verified: bool


@dataclass(frozen=True)
class Prediction:
    probability: float
    water_level_m: float
    raw_logit: float


def _sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1.0 + e)


def _tree_sum(trees: list[dict[str, list[float]]], features: list[float]) -> float:
    total = 0.0
    for tree in trees:
        node = 0
        left, right, feature, threshold = tree["l"], tree["r"], tree["f"], tree["t"]
        while left[node] != -1:
            node = left[node] if features[int(feature[node])] <= threshold[node] else right[node]
        total += tree["v"][node]
    return total


class ModelRuntime:
    """Immutable, thread-safe wrapper around the exported model."""

    def __init__(self, path: Path) -> None:
        payload = json.loads(path.read_text())
        meta = payload["meta"]
        self.path = path
        self.version: str = meta["version"]
        self.name: str = meta["name"]
        self.kind: str = meta["kind"]
        self.warning: str = meta["warning"]
        self.feature_names: tuple[str, ...] = tuple(meta["feature_names"])
        self.learning_rate = meta["learning_rate"]
        self.init = meta["init"]
        self.operating_threshold: float = float(payload["operating_threshold"])
        self.metrics: Mapping[str, Any] = payload["metrics"]
        self.et0_by_month: Mapping[str, float] = payload["et0_by_month"]
        self._classifier_trees = payload["classifier"]["trees"]
        self._regressor_trees = payload["regressor"]["trees"]
        self.cities: dict[str, CityConfig] = {}
        for key, city in payload["cities"].items():
            self.cities[_slug(key)] = CityConfig(
                code=_slug(key),
                name=key,
                river=city["river"],
                latitude=city["lat"],
                longitude=city["lon"],
                elevation_m=city["elev"],
                alarm_levels_m=tuple(city["alarms"]),
                alarms_verified=bool(city.get("alarms_verified", False)),
            )
        # Recover the one-hot layout from the export instead of assuming it.
        # The reference category is the supported city that has no dummy column.
        self.city_dummy_order = tuple(
            _slug(name.split("=", 1)[1]) for name in self.feature_names if name.startswith("city=")
        )
        references = [code for code in self.cities if code not in self.city_dummy_order]
        if len(references) != 1:
            raise ValueError(
                "cannot determine the one-hot reference city from the export; retrain the model"
            )
        self.city_reference = references[0]
        expected = (
            len(NUMERIC_FEATURES) + len(DERIVED_FEATURES) + len(self.city_dummy_order)
        )
        if len(self.feature_names) != expected:
            raise ValueError(
                "feature vector length does not match the export; retrain with ml/train_test_model.py"
            )

    # -- geometry ---------------------------------------------------------
    def feature_vector(self, inputs: Mapping[str, float], city_code: str, month: int) -> list[float]:
        city = self.city(city_code)
        angle = 2 * math.pi * month / 12
        values = [float(inputs[key]) for key in NUMERIC_FEATURES]
        values += [math.sin(angle), math.cos(angle), city.elevation_m]
        # One-hot in the order the export recorded, so a retrained model with a
        # different reference city cannot silently scramble the layout.
        values += [1.0 if code == city_code else 0.0 for code in self.city_dummy_order]
        return values

    def city(self, code: str) -> CityConfig:
        try:
            return self.cities[_slug(code)]
        except KeyError as exc:  # pragma: no cover - guarded by the API layer
            raise KeyError(f"unknown location: {code}") from exc

    @property
    def supported_cities(self) -> tuple[str, ...]:
        return tuple(city.name for city in self.cities.values())

    def et0_for(self, month: int) -> float:
        return float(self.et0_by_month.get(str(month), 3.8))

    # -- inference --------------------------------------------------------
    def predict(self, inputs: Mapping[str, float], city_code: str, month: int) -> Prediction:
        features = self.feature_vector(inputs, city_code, month)
        logit = self.init["classifier"] + self.learning_rate["classifier"] * _tree_sum(
            self._classifier_trees, features
        )
        water_level = self.init["regressor"] + self.learning_rate["regressor"] * _tree_sum(
            self._regressor_trees, features
        )
        return Prediction(
            probability=_sigmoid(logit),
            water_level_m=float(water_level),
            raw_logit=float(logit),
        )


def _slug(value: str) -> str:
    return value.strip().lower().replace(" ", "-")


_lock = threading.Lock()
_cache: dict[Path, ModelRuntime] = {}


def load_model(path: Path) -> ModelRuntime:
    """Load (and memoise) the model artifact for a path."""
    if not path.is_file():
        raise ModelNotLoadedError(
            f"model artifact not found at {path}; run `python3 ml/train_test_model.py` first"
        )
    with _lock:
        runtime = _cache.get(path)
        if runtime is None:
            runtime = ModelRuntime(path)
            _cache[path] = runtime
        return runtime


def model_loaded_at(path: Path) -> str | None:
    if not path.is_file():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat(timespec="seconds")
