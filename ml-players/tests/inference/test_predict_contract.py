import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

from ml_players.inference.main import app


def test_no_model_returns_internal_200_without_statistics(monkeypatch):
    monkeypatch.setenv("ML_FASTAPI_INTERNAL_TOKEN", "test-token")
    with TestClient(app) as client:
        response = client.post("/internal/predict", headers={"X-ML-Internal-Token": "test-token"}, json={"fechaGeneracion": "2026-01-01T00:00:00Z", "fechaObjetivo": "2026-01-16", "position": "forward", "features": {}})
    assert response.status_code == 200
    assert response.json()["estado"] in {"ready", "no_model_loaded"}
    if response.json()["estado"] == "no_model_loaded":
        assert "estadisticasPredichas" not in response.json() or response.json()["estadisticasPredichas"] is None
