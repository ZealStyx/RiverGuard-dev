"""Risk vocabulary must match convex/validators.ts, and thresholds must be explained."""
from __future__ import annotations

from datetime import date

import pytest

from app.services.model_runtime import ModelRuntime, load_model
from app.core.config import settings
from app.services.risk_classification import assess, should_raise_alert


def test_levels_match_the_convex_validator_vocabulary():
    allowed = {"lower", "moderate", "elevated", "unavailable"}
    results = {
        assess(0.0, 10.0, (15, 16, 18), 0.3439).risk_level,
        assess(0.01, 10.0, (15, 16, 18), 0.3439).risk_level,
        assess(0.99, 10.0, (15, 16, 18), 0.3439).risk_level,
        assess(None, None, (15, 16, 18), 0.3439).risk_level,
    }
    assert results <= allowed


def test_water_level_alone_can_raise_the_level():
    assessment = assess(0.0, 16.4, (15, 16, 18), 0.3439)
    assert assessment.risk_level == "elevated"
    assert assessment.alert_level == "second"
    assert should_raise_alert(assessment) is True


def test_probability_alone_can_raise_the_level():
    assessment = assess(0.8, 13.0, (15, 16, 18), 0.3439)
    assert assessment.risk_level == "elevated"
    assert assessment.exceeds_operating_threshold is True


def test_moderate_never_raises_an_alert():
    assessment = assess(0.15, 13.0, (15, 16, 18), 0.3439)
    assert assessment.risk_level == "moderate"
    assert should_raise_alert(assessment) is False


def test_missing_inputs_are_unavailable_not_lower():
    assessment = assess(None, None, (15, 16, 18), 0.3439)
    assert assessment.risk_level == "unavailable"
    assert should_raise_alert(assessment) is False
    assert "unavailable" in assessment.reasons[0].lower()


def test_every_assessment_explains_itself():
    for probability, level in [(0.0, 10.0), (0.5, 14.0), (0.99, 18.5)]:
        assert assess(probability, level, (15, 16, 18), 0.3439).reasons


@pytest.mark.parametrize(
    "location,inputs,month,expected_probability,expected_water_level",
    [
        # Golden values produced by the same export in ml/predictor.html (the browser
        # path) and independently in Python. If these drift, one of the three
        # evaluators is wrong.
        (
            "marikina",
            {"rain_next": 46, "rain_today": 12, "ant3": 50, "ant7": 120, "ant30": 270,
             "soil": 66, "tmax": 31, "tmin": 25},
            11,
            0.13519658301156817,
            14.582313923199997,
        ),
        (
            "manila",
            {"rain_next": 180, "rain_today": 90, "ant3": 210, "ant7": 380, "ant30": 600,
             "soil": 90, "tmax": 29, "tmin": 25},
            11,
            0.9999983773462837,
            15.986919708799995,
        ),
        (
            "quezon-city",
            {"rain_next": 0, "rain_today": 0, "ant3": 0, "ant7": 3, "ant30": 40,
             "soil": 20, "tmax": 33, "tmin": 24},
            3,
            0.00028638047746064706,
            11.0337277752,
        ),
        (
            "pasig",
            {"rain_next": 75, "rain_today": 40, "ant3": 120, "ant7": 240, "ant30": 400,
             "soil": 78, "tmax": 30, "tmin": 26},
            8,
            0.9999303353557137,
            13.5291346384,
        ),
    ],
)
def test_runtime_matches_the_exported_artifact(
    location, inputs, month, expected_probability, expected_water_level
):
    """The service must reproduce the artifact bit for bit — no reimplementation drift."""
    runtime: ModelRuntime = load_model(settings.model_path)
    prediction = runtime.predict(inputs, location, month)
    assert prediction.probability == pytest.approx(expected_probability, abs=1e-9)
    assert prediction.water_level_m == pytest.approx(expected_water_level, abs=1e-9)


def test_one_hot_layout_comes_from_the_export():
    """A retrained model may reorder or re-reference cities; the runtime must follow."""
    runtime: ModelRuntime = load_model(settings.model_path)
    assert runtime.city_reference not in runtime.city_dummy_order
    assert len(runtime.city_dummy_order) == len(runtime.cities) - 1
    vector = runtime.feature_vector(
        {"rain_next": 0, "rain_today": 0, "ant3": 0, "ant7": 0, "ant30": 0,
         "soil": 40, "tmax": 31, "tmin": 25},
        "marikina",
        6,
    )
    assert sum(vector[-len(runtime.city_dummy_order):]) == 1.0
