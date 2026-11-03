from ml_players.inference.security import internal_token


def test_default_internal_token_is_defined(monkeypatch):
    monkeypatch.delenv("ML_FASTAPI_INTERNAL_TOKEN", raising=False)
    assert internal_token() == "dev-ml-token"
