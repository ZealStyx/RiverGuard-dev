"""Turns a probability and a water level into the vocabulary the UI already uses.

``lower | moderate | elevated | unavailable`` matches ``riskLevelValidator`` in
convex/validators.ts, so a stored assessment and a rendered label cannot drift.

Two independent signals are combined:

* probability from the classifier, against the operating threshold that was
  tuned on the 2024 validation year;
* predicted water level, against the station's published alarm levels.

Either signal can raise the level; a missing input makes it ``unavailable``
rather than silently defaulting to "lower".
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

RiskLevel = Literal["lower", "moderate", "elevated", "unavailable"]
AlertLevel = Literal["none", "first", "second", "third"]

# A quarter of the operating threshold: below this the classifier is in the
# region where the test set contained no positives at all.
MODERATE_PROBABILITY_FRACTION = 0.25


@dataclass(frozen=True)
class RiskAssessment:
    risk_level: RiskLevel
    probability: float | None
    water_level_m: float | None
    alert_level: AlertLevel
    exceeds_operating_threshold: bool
    reasons: list[str]


def assess(
    probability: float | None,
    water_level_m: float | None,
    alarm_levels_m: tuple[float, float, float],
    operating_threshold: float,
) -> RiskAssessment:
    if probability is None or water_level_m is None:
        return RiskAssessment(
            risk_level="unavailable",
            probability=probability,
            water_level_m=water_level_m,
            alert_level="none",
            exceeds_operating_threshold=False,
            reasons=["Model input was unavailable; no assessment produced."],
        )

    alert_level: AlertLevel = "none"
    reasons: list[str] = []
    if water_level_m >= alarm_levels_m[2]:
        alert_level = "third"
        reasons.append(f"Predicted level {water_level_m:.2f} m is at or above the third alarm "
                       f"({alarm_levels_m[2]:.1f} m).")
    elif water_level_m >= alarm_levels_m[1]:
        alert_level = "second"
        reasons.append(f"Predicted level {water_level_m:.2f} m is at or above the second alarm "
                       f"({alarm_levels_m[1]:.1f} m).")
    elif water_level_m >= alarm_levels_m[0]:
        alert_level = "first"
        reasons.append(f"Predicted level {water_level_m:.2f} m is at or above the first alarm "
                       f"({alarm_levels_m[0]:.1f} m).")

    exceeds = probability >= operating_threshold
    if exceeds:
        reasons.append(
            f"Probability {probability:.1%} is above the operating threshold "
            f"({operating_threshold:.1%})."
        )

    if alert_level in ("second", "third") or probability >= 0.5:
        level: RiskLevel = "elevated"
    elif exceeds or alert_level == "first" or probability >= operating_threshold * 0.5:
        level = "elevated" if exceeds else "moderate"
    elif probability >= operating_threshold * MODERATE_PROBABILITY_FRACTION:
        level = "moderate"
    else:
        level = "lower"

    if not reasons:
        reasons.append(
            f"Probability {probability:.1%} and level {water_level_m:.2f} m stay below alarms "
            f"and the operating threshold."
        )
    return RiskAssessment(
        risk_level=level,
        probability=probability,
        water_level_m=water_level_m,
        alert_level=alert_level,
        exceeds_operating_threshold=exceeds,
        reasons=reasons,
    )


def should_raise_alert(assessment: RiskAssessment) -> bool:
    """Alerts are created only for elevated assessments, never for 'moderate'."""
    return assessment.risk_level == "elevated"
