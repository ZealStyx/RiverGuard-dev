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


# --- ET0 drives the soil bucket (audit P1-9) --------------------------------
#
# The generator that produced the training data drains soil with
# `SM_t = SM_{t-1} + rain - ET0 - 0.08*SM_{t-1}`. The chain applied rain but left
# ET0 at a monthly normal, so two very different weeks dried the catchment the
# same way. These tests pin the provider's own figure into that term.


def _soil_trail(body: dict) -> list[float]:
    return [day["soilMoisturePercent"] for day in body["days"]]


def test_provider_et0_drains_the_bucket_faster(client, week):
    # A bucket that is not near saturation, so the clamp cannot hide the difference:
    # the observed day's soil is the chain's starting state, never an advanced one.
    state = {
        "rainfallTodayMm": 0,
        "antecedentRain3dMm": 0,
        "antecedentRain7dMm": 0,
        "antecedentRain30dMm": 10,
        "soilMoisturePercent": 55,
    }
    light_rain = [{**day, "rainfallMm": 2.0, "et0Mm": 6.0} for day in week]
    same_rain_low_et0 = [{**day, "rainfallMm": 2.0, "et0Mm": 1.0} for day in week]

    dry = client.post("/v1/forecast/daily", json=payload("marikina", state, light_rain)).json()
    humid = client.post(
        "/v1/forecast/daily", json=payload("marikina", state, same_rain_low_et0)
    ).json()

    # Day 1 shows the observed state, so the two agree there and diverge after it.
    assert _soil_trail(dry)[0] == _soil_trail(humid)[0] == 55
    assert _soil_trail(dry)[-1] < _soil_trail(humid)[-1]
    assert (
        _soil_trail(humid)[-1] - _soil_trail(dry)[-1]
        > _soil_trail(humid)[1] - _soil_trail(dry)[1]
    )


def test_a_sunny_dry_week_recedes_instead_of_holding(client, week):
    """No rain and real ET0 must lower the bucket every day — never a constant."""
    dry = {
        "rainfallTodayMm": 0,
        "antecedentRain3dMm": 0,
        "antecedentRain7dMm": 0,
        "antecedentRain30dMm": 10,
        "soilMoisturePercent": 40,
    }
    days = [{**day, "rainfallMm": 0, "et0Mm": 5.0, "tmaxC": 34.0} for day in week]
    body = client.post("/v1/forecast/daily", json=payload("marikina", dry, days)).json()

    trail = _soil_trail(body)
    assert all(later < earlier for earlier, later in zip(trail, trail[1:]))


def test_missing_et0_falls_back_to_the_monthly_normal(client, observed, week):
    """Older callers that send no ET0 keep the previous behaviour exactly."""
    absent = client.post("/v1/forecast/daily", json=payload("marikina", observed, week)).json()
    explicit_null = [
        {**day, "et0Mm": None} for day in week
    ]
    nulled = client.post(
        "/v1/forecast/daily", json=payload("marikina", observed, explicit_null)
    ).json()

    assert _soil_trail(nulled) == _soil_trail(absent)


def test_next_day_agrees_with_the_first_daily_day(client, observed, week):
    """The two endpoints build the same day from the same inputs, ET0 included.

    They assemble their own `DailyWeather`, so a field added to one and not the
    other would show as two different answers for the same question.
    """
    day = {**week[0], "et0Mm": 4.5}
    single = client.post("/v1/forecast/next-day", json=payload("marikina", observed, [day]))
    daily = client.post("/v1/forecast/daily", json=payload("marikina", observed, week))

    assert single.status_code == 200, single.text
    assert daily.status_code == 200, daily.text
    first = daily.json()["days"][0]
    assert single.json()["day"]["probability"] == first["probability"]
    assert single.json()["day"]["soilMoisturePercent"] == first["soilMoisturePercent"]


def test_et0_outside_a_plausible_range_is_rejected(client, observed, week):
    absurd = [{**day, "et0Mm": 40.0} for day in week]
    response = client.post("/v1/forecast/daily", json=payload("marikina", observed, absurd))
    assert response.status_code == 422
    assert "et0Mm" in response.text
