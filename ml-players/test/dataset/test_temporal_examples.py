from datetime import date, timedelta

from ml_players.dataset.temporal_examples import build_examples
from ml_players.snapshots.schema import PlayerSnapshot


def snapshot(day: int) -> PlayerSnapshot:
    return PlayerSnapshot("p1", "whoscored", "2025", date(2025, 1, day), {name: 1 for name in ("goles", "asistencias", "tiros", "pasesClave", "regates", "faltasCometidas", "rating")})


def test_target_is_nearest_future_snapshot_with_three_day_tolerance():
    examples = build_examples([snapshot(1), snapshot(15), snapshot(19)])
    assert len(examples) == 1
    assert examples[0].fecha_objetivo == date(2025, 1, 16)
    assert examples[0].snapshot_objetivo.fecha == date(2025, 1, 15)


def test_excludes_snapshot_outside_tolerance_or_before_prediction():
    assert build_examples([snapshot(1), snapshot(25)]) == []
