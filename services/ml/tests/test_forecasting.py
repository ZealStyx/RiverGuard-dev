"""The chain must behave like the training data, and must beat no-op defaults."""
from __future__ import annotations

import pytest


def payload(location: str, observed: dict, days: list[dict], issue: str = "2026-11-15") -> dict:
    return {"locationCode": location, "issueDate": issue, "observed": observed, "days": days}


def test_daily_forecast_returns_one_entry_per_day(client, observed, week):
    response = client.post("/v1/forecast/daily", json=payload("marikina", observed, week))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["locationCode"] == "marikina"
    assert body["locationName"] == "Marikina"
    assert [day["horizonDays"] for day in body["days"]] == [1, 2, 3, 4, 5, 6, 7]
    assert [day["date"] for day in body["days"]] == [day["date"] for day in week]
    assert body["meta"]["alarms"] == [15.0, 16.0, 18.0]
    assert body["meta"]["modelVersion"] == "0.1.0-test"


def test_antecedent_rain_accumulates_through_the_chain(client, observed, week):
    body = client.post("/v1/forecast/daily", json=payload("marikina", observed, week)).json()
    day1, day2 = body["days"][0], body["days"][1]
    # 46 mm fell on day 1, so day 2's 3-day window must be wetter than today's 50 mm.
    assert day2["antecedentRain3dMm"] > day1["antecedentRain3dMm"]
    assert day2["soilMoisturePercent"] >= day1["soilMoisturePercent"] - 8
    # And it decays once the rain stops.
    assert body["days"][-1]["antecedentRain30dMm"] <= max(
        day["antecedentRain30dMm"] for day in body["days"][:3]
    )


def test_dry_week_stays_lower_and_below_alarms(client, week):
    dry = {
        "rainfallTodayMm": 0,
        "antecedentRain3dMm": 0,
        "antecedentRain7dMm": 3,
        "antecedentRain30dMm": 40,
        "soilMoisturePercent": 22,
    }
    days = [{**day, "rainfallMm": 0} for day in week]
    body = client.post("/v1/forecast/daily", json=payload("marikina", dry, days)).json()
    assert all(day["riskLevel"] == "lower" for day in body["days"])
    assert all(day["alertLevel"] == "none" for day in body["days"])
    assert all(day["probability"] < 0.05 for day in body["days"])


def test_ulysses_class_scenario_is_elevated_at_the_third_alarm(client, week):
    storm = {
        "rainfallTodayMm": 60,
        "antecedentRain3dMm": 190,
        "antecedentRain7dMm": 330,
        "antecedentRain30dMm": 520,
        "soilMoisturePercent": 88,
    }
    days = [{**week[0], "rainfallMm": 200}]
    body = client.post("/v1/forecast/daily", json=payload("marikina", storm, days)).json()
    day = body["days"][0]
    assert day["riskLevel"] == "elevated"
    assert day["alertLevel"] == "third"
    assert day["probability"] > 0.9
    assert day["waterLevelM"] > 18.0


@pytest.mark.parametrize(
    "observation,mutation",
    [
        ({"antecedentRain3dMm": 200, "antecedentRain7dMm": 100}, "windows must nest"),
        ({"rainfallTodayMm": -1}, "greater than or equal to 0"),
        ({"soilMoisturePercent": 140}, "less than or equal to 100"),
    ],
)
def test_invalid_observations_are_rejected(client, observed, week, observation, mutation):
    body = client.post(
        "/v1/forecast/daily", json=payload("marikina", {**observed, **observation}, week)
    )
    assert body.status_code == 422
    assert mutation in body.text


def test_unknown_location_is_404(client, observed, week):
    response = client.post("/v1/forecast/daily", json=payload("cebu", observed, week))
    assert response.status_code == 404


def test_next_day_carries_a_sensitivity_ranking(client, observed, week):
    body = client.post("/v1/forecast/next-day", json=payload("marikina", observed, week)).json()
    assert len(body["contributions"]) == 5
    deltas = [abs(row["deltaProbability"]) for row in body["contributions"]]
    assert deltas == sorted(deltas, reverse=True)
    assert body["contributions"][0]["key"] in {
        "rain_next", "rain_today", "ant3", "ant7", "ant30", "soil", "tmax", "tmin",
    }
    assert body["day"]["date"] == week[0]["date"]
