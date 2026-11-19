"""Read endpoints over the real dataset.

These exist so the web application never has to invent a number: every series it
charts, every provenance label it shows, and the observed state it feeds the
model all come from ``data/daily_observations.csv`` through these routes.
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.services import dataset as store

router = APIRouter(prefix="/v1/data", tags=["data"])


@router.get("/meta")
def meta() -> dict[str, object]:
    """Dataset identity, coverage, and rainfall provenance."""
    try:
        return store.dataset_meta()
    except store.DatasetUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/observations")
def observations(
    location: str = Query(description="City name or slug, e.g. 'Marikina' or 'marikina'."),
    start: date | None = Query(default=None, description="Inclusive lower bound."),
    end: date | None = Query(default=None, description="Inclusive upper bound."),
    limit: int = Query(default=30, ge=1, le=3650),
) -> dict[str, object]:
    """Observed daily rows for one city, oldest first."""
    try:
        rows = store.observations_between(location, start, end, limit)
        if not rows:
            raise HTTPException(
                status_code=404, detail=f"no observations for {location!r} in that range"
            )
        return {
            "location": rows[0].location,
            "locationCode": store.slug(rows[0].location),
            "count": len(rows),
            "dateMin": rows[0].date.isoformat(),
            "dateMax": rows[-1].date.isoformat(),
            "observations": [row.as_dict() for row in rows],
        }
    except store.DatasetUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/latest")
def latest(location: str = Query(description="City name or slug.")) -> dict[str, object]:
    """The most recent row — the state the model should be chain-seeded from."""
    try:
        payload = store.observed_state_payload(location)
    except store.DatasetUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if payload is None:
        raise HTTPException(status_code=404, detail=f"no observations for {location!r}")
    return dict(payload)


@router.get("/monthly")
def monthly(
    location: str = Query(description="City name or slug."),
    months: int = Query(default=24, ge=1, le=131),
) -> dict[str, object]:
    """Monthly rainfall totals and flood-day counts from the same rows."""
    try:
        series = store.monthly_totals(location, months)
        if not series:
            raise HTTPException(status_code=404, detail=f"no observations for {location!r}")
        return {"location": location, "months": len(series), "series": series}
    except store.DatasetUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
