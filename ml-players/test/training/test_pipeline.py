from datetime import date, timedelta

from ml_players.inference.model_loader import load_model
from ml_players.snapshots.schema import PlayerSnapshot
from ml_players.training.pipeline import train_and_persist


def snapshots_fixture() -> list[PlayerSnapshot]:
    return [
        PlayerSnapshot(
            id_jugador_externo="fixture-player",
            proveedor="synthetic",
            temporada="2025",
            fecha=date(2025, 1, 1) + timedelta(days=15 * index),
            estadisticas={
                "goles": float(index + 1),
                "asistencias": float(index),
                "tiros": float(index + 4),
                "pasesClave": float(index + 2),
                "regates": float(index + 3),
                "faltasCometidas": float(index + 1),
                "rating": 6.5 + index * 0.2,
            },
            posicion="forward",
        )
        for index in range(6)
    ]


def test_training_versions_model_and_returns_metrics(tmp_path):
    result = train_and_persist(snapshots_fixture(), "synthetic", tmp_path)

    assert result["estado"] == "entrenado"
    assert result["cantidadEjemplos"] == 5
    assert "prueba" in result["metricas"]
    model = load_model(result["artifactPath"], result["manifestPath"])
    assert model.version_modelo == result["versionModelo"]
    assert model.manifest["positionEncoding"] == "one_hot_drop_unknown"
    assert "position_forward" in model.manifest["inputSchema"]
    assert "position_unknown" not in model.manifest["inputSchema"]
    assert len(model.artifact["coefficients"][0]) == 11
    assert "featureNormalization" in model.manifest
    assert model.manifest["inputPolicy"] == "clip_to_training_range"
    assert "featureBounds" in model.manifest
