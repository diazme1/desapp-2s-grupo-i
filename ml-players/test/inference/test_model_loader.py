from pathlib import Path

from ml_players.inference.model_loader import LoadedModel, load_model


def test_loads_deterministic_fixture_and_returns_only_statistics():
    fixture = Path(__file__).parents[1] / "fixtures" / "model-fixture"
    model = load_model(fixture / "model.joblib", fixture / "manifest.json")
    result = model.predict({"goles": 1, "asistencias": 2, "tiros": 3, "pasesClave": 4, "regates": 5, "faltasCometidas": 6, "rating": 7})
    assert model.version_modelo == "fixture-model-1"
    assert set(result) == {"goles", "asistencias", "tiros", "pasesClave", "regates", "faltasCometidas", "ratingWhoScored"}
    assert "cotizacion" not in result


def test_prediction_uses_the_position_feature():
    model = LoadedModel(
        version_modelo="position-fixture",
        manifest={"inputSchema": ["position_forward"], "scales": {"goles": 0}},
        artifact={"intercept": [0] * 7, "coefficients": [[2], [0], [0], [0], [0], [0], [0]]},
    )

    assert model.predict({}, "forward")["goles"] == "2"
    assert model.predict({}, "defender")["goles"] == "0"
