from __future__ import annotations

from app.core.config import settings


def test_health_reports_model_file_state(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "riverguard-ml"
    assert body["modelFilePresent"] is True


def test_ready_loads_the_exported_model(client):
    response = client.get("/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["model"]["version"] == "0.1.0-test"
    assert body["model"]["operatingThreshold"] == 0.3439
    assert body["cities"] == ["marikina", "quezon-city", "manila", "pasig"]
    # The warning has to travel with the model, not only live in the docs.
    assert "derived" in body["warning"].lower()


def test_cities_expose_alarm_levels_and_their_provenance(client):
    response = client.get("/v1/cities")
    assert response.status_code == 200
    cities = {city["code"]: city for city in response.json()["cities"]}
    assert cities["marikina"]["alarmLevelsM"] == [15.0, 16.0, 18.0]
    assert cities["marikina"]["alarmsVerified"] is True
    # Pasig and the rest are indicative, and the payload says so.
    assert cities["pasig"]["alarmsVerified"] is False


def test_model_path_is_configurable(monkeypatch, tmp_path):
    from app.core import config

    monkeypatch.setenv("ML_MODEL_PATH", str(tmp_path / "missing.json"))
    reloaded = config.load_settings()
    assert reloaded.model_path == tmp_path / "missing.json"
    assert reloaded.model_exists is False
    assert settings.model_exists is True
