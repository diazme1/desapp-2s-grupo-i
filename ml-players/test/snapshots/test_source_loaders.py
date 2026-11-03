from datetime import date
from dataclasses import replace

import pytest

from ml_players.snapshots.app_loader import load_app
from ml_players.snapshots.synthetic_loader import load_synthetic
from ml_players.snapshots.whoscored_loader import load_whoscored


def row():
    return {"playerId": "external-1", "season": "2025", "date": date(2025, 1, 1), "statistics": {name: 1 for name in ("goles", "asistencias", "tiros", "pasesClave", "regates", "faltasCometidas", "rating")}}


def test_loaders_propagate_origin():
    assert load_whoscored([row()])[0].proveedor == "whoscored"
    assert load_app([row()])[0].proveedor == "app"
    assert load_synthetic([row()])[0].proveedor == "synthetic"


def test_snapshot_validation_rejects_negative_or_unusable_values():
    snapshot = load_whoscored([row()])[0]
    snapshot.estadisticas["goles"] = -1
    with pytest.raises(ValueError, match="no negativa"):
        snapshot.validate()

    invalid_granularity = replace(load_whoscored([row()])[0], granularidad="season")
    with pytest.raises(ValueError, match="granularidad"):
        invalid_granularity.validate()
