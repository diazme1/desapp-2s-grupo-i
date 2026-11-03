import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

from ml_players.inference.main import app


def test_missing_and_invalid_internal_token_are_rejected(monkeypatch):
    monkeypatch.setenv("ML_FASTAPI_INTERNAL_TOKEN", "test-token")
    with TestClient(app) as client:
        missing = client.get("/internal/health")
        invalid = client.get("/internal/health", headers={"X-ML-Internal-Token": "bad"})
    assert missing.status_code == 401
    assert invalid.status_code == 403
