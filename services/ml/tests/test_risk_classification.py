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
        # A regression snapshot of this artifact's own output (model.json
        # 0.1.0-test). These numbers carry no expectation about the weather: they
        # exist so that a change to the runtime's arithmetic shows up as a diff.
        # A retrain legitimately changes them — recompute with
        # `load_model(settings.model_path).predict(inputs, location, month)` — which
        # is why the assertions below also pin the invariants that must hold
        # whatever the weights are.
        (
            "marikina",
            {"rain_next": 46, "rain_today": 12, "ant3": 50, "ant7": 120, "ant30": 270,
             "soil": 66, "tmax": 31, "tmin": 25},
            11,
            0.003149145444412732,
            14.376887907999999,
        ),
        (
            "manila",
            {"rain_next": 180, "rain_today": 90, "ant3": 210, "ant7": 380, "ant30": 600,
             "soil": 90, "tmax": 29, "tmin": 25},
            11,
            0.9999997552166224,
            14.392761701599998,
        ),
        (
            "quezon-city",
            {"rain_next": 0, "rain_today": 0, "ant3": 0, "ant7": 3, "ant30": 40,
             "soil": 20, "tmax": 33, "tmin": 24},
            3,
            0.00024236049853864242,
            11.1105998824,
        ),
        (
            "pasig",
            {"rain_next": 75, "rain_today": 40, "ant3": 120, "ant7": 240, "ant30": 400,
             "soil": 78, "tmax": 30, "tmin": 26},
            8,
            0.9987200342213459,
            12.79896662,
        ),
    ],
)
def test_runtime_matches_the_exported_artifact(
    location, inputs, month, expected_probability, expected_water_level
):
    """The runtime must reproduce the snapshot, and stay sane whatever it holds."""
    runtime: ModelRuntime = load_model(settings.model_path)
    prediction = runtime.predict(inputs, location, month)

    # Invariants first: these must hold for any weights, so a retrain that
    # changes the snapshot cannot hide a broken evaluator behind new numbers.
    assert 0.0 <= prediction.probability <= 1.0
    assert 9.0 <= prediction.water_level_m <= 19.0  # the dataset's stage envelope
    repeat = runtime.predict(inputs, location, month)
    assert repeat.probability == prediction.probability
    assert repeat.water_level_m == prediction.water_level_m

    # Then the snapshot itself.
    assert prediction.probability == pytest.approx(expected_probability, abs=1e-9)
    assert prediction.water_level_m == pytest.approx(expected_water_level, abs=1e-9)


def test_heavy_rain_never_lowers_the_risk():
    """More rain on a wetter catchment must not read as less danger.

    This is the one direction the pipeline cannot get wrong without being
    useless: a model that inverts it would still pass every snapshot above.
    """
    runtime: ModelRuntime = load_model(settings.model_path)
    dry_inputs = {
        "rain_next": 0,
        "rain_today": 0,
        "ant3": 0,
        "ant7": 5,
        "ant30": 40,
        "soil": 20,
        "tmax": 33,
        "tmin": 24,
    }
    wet_inputs = {**dry_inputs, "rain_next": 120, "ant3": 120, "ant7": 240, "soil": 90}

    dry = runtime.predict(dry_inputs, "marikina", 8)
    wet = runtime.predict(wet_inputs, "marikina", 8)

    assert wet.probability >= dry.probability
    assert wet.water_level_m >= dry.water_level_m
    assert wet.water_level_m - dry.water_level_m > 0.5


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
