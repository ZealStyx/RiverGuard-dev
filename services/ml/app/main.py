"""RiverGuard local inference service.

Runs on the developer's machine only. The browser never calls this service
directly; the Next.js route handler in ``apps/web/src/app/api/forecast`` does,
and it is the only component that talks to the weather provider, this service,
and the Convex deployment. See docs/guides/forecast-pipeline.md.

    uvicorn app.main:app --reload --port 8000   (from services/ml)
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import data, forecast, health, risk
from app.core.config import settings

DESCRIPTION = """
Local inference for RiverGuard's next-day flood probability and water level.

**This is a test model.** In dataset v2, water level, soil moisture and flood
labels are derived from rainfall by documented formulas, so predictions
reproduce the generator rather than an observed hydrological response. Output is
decision support for a research prototype, never an official warning.
"""

app = FastAPI(
    title="RiverGuard ML",
    version="0.1.0",
    description=DESCRIPTION,
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
)

app.include_router(health.router)
app.include_router(data.router)
app.include_router(forecast.router)
app.include_router(risk.router)


@app.get("/", include_in_schema=False)
def index() -> dict:
    return {
        "service": settings.service_name,
        "docs": "/docs",
        "endpoints": [
            "GET /health",
            "GET /health/ready",
            "GET /v1/cities",
            "GET /v1/data/meta",
            "GET /v1/data/latest",
            "GET /v1/data/observations",
            "GET /v1/data/monthly",
            "POST /v1/forecast/daily",
            "POST /v1/forecast/next-day",
            "POST /v1/risk/assess",
        ],
    }
