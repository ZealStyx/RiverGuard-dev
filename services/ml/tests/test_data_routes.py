"""The data routes must serve the real dataset, with provenance intact."""

from __future__ import annotations

import pytest


def test_meta_reports_real_coverage(client):
    response = client.get("/v1/data/meta")
    assert response.status_code == 200
    body = response.json()

    assert body["rows"] > 15000
    assert body["dateMin"] == "2016-01-01"
    assert body["dateMax"] == "2026-11-14"
    assert set(body["locations"]) == {"Manila", "Marikina", "Pasig", "Quezon City"}


def test_meta_dates_the_real_rain_segment(client):
    """`ERA5-anchor` marks two isolated 2020 rows; the switch is still 2025-11-15."""
    body = client.get("/v1/data/meta").json()
    assert body["realRainFrom"] == "2025-11-15"
    assert "ERA5-anchor" in body["rainSources"]


def test_latest_returns_the_observed_state_the_model_needs(client):
    response = client.get("/v1/data/latest", params={"location": "marikina"})
    assert response.status_code == 200
    body = response.json()

    assert body["asOfDate"] == "2026-11-14"
    assert body["rainSource"] == "ERA5-reanalysis"
    # The dataset's own quality label must not claim a gauge observation.
    assert "derived-wl" in body["qualityStatus"]

    # The ML service validates this nesting, so the route has to satisfy it.
    assert (
        body["antecedentRain3dMm"]
        <= body["antecedentRain7dMm"]
        <= body["antecedentRain30dMm"]
    )
    assert 0 <= body["soilMoisturePercent"] <= 100


@pytest.mark.parametrize("location", ["Marikina", "marikina", "Quezon City"])
def test_location_lookup_accepts_name_or_slug(client, location):
    response = client.get("/v1/data/latest", params={"location": location})
    assert response.status_code == 200


def test_unknown_location_is_a_404(client):
    response = client.get("/v1/data/latest", params={"location": "Cebu"})
    assert response.status_code == 404


def test_observations_are_ordered_and_bounded(client):
    response = client.get(
        "/v1/data/observations", params={"location": "Manila", "limit": 5}
    )
    assert response.status_code == 200
    body = response.json()

    assert body["count"] == 5
    dates = [row["date"] for row in body["observations"]]
    assert dates == sorted(dates)
    assert dates[-1] == "2026-11-14"


def test_monthly_totals_match_the_raw_rows(client):
    observations = client.get(
        "/v1/data/observations",
        params={
            "location": "Pasig",
            "start": "2026-09-01",
            "end": "2026-09-30",
            "limit": 31,
        },
    ).json()["observations"]
    expected = round(sum(row["rainfallMm"] or 0 for row in observations), 1)

    monthly = client.get(
        "/v1/data/monthly", params={"location": "Pasig", "months": 3}
    ).json()["series"]
    september = next(row for row in monthly if row["month"] == "2026-09")

    assert september["rainfallMm"] == pytest.approx(expected, abs=0.1)
