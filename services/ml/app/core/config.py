"""Runtime configuration for the local inference service.

Everything is env-overridable so the service can run from a different checkout
or point at a different model export without code changes.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

# services/ml/app/core/config.py -> core -> app -> ml -> services -> repository root
REPO_ROOT = Path(__file__).resolve().parents[4]


def _path_from_env(name: str, default: Path) -> Path:
    raw = os.environ.get(name)
    return Path(raw).expanduser().resolve() if raw else default


@dataclass(frozen=True)
class Settings:
    model_path: Path
    feature_schema_version: str
    allowed_origins: tuple[str, ...]
    max_forecast_days: int
    service_name: str = "riverguard-ml"

    @property
    def model_exists(self) -> bool:
        return self.model_path.is_file()


def load_settings() -> Settings:
    origins = os.environ.get(
        "ML_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    return Settings(
        model_path=_path_from_env(
            "ML_MODEL_PATH", REPO_ROOT / "ml" / "artifacts" / "model.json"
        ),
        feature_schema_version=os.environ.get("ML_FEATURE_SCHEMA_VERSION", "v2-daily"),
        allowed_origins=tuple(o.strip() for o in origins.split(",") if o.strip()),
        max_forecast_days=int(os.environ.get("ML_MAX_FORECAST_DAYS", "14")),
    )


settings = load_settings()
