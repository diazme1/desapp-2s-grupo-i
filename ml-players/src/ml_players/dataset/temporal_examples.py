from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from ml_players.snapshots.schema import PlayerSnapshot


@dataclass(frozen=True)
class TemporalExample:
    snapshot_inicial: PlayerSnapshot
    fecha_prediccion: date
    fecha_objetivo: date
    snapshot_objetivo: PlayerSnapshot


def build_examples(snapshots: list[PlayerSnapshot], tolerance_days: int = 3) -> list[TemporalExample]:
    result: list[TemporalExample] = []
    for current in snapshots:
        target_date = current.fecha + timedelta(days=15)
        candidates = [s for s in snapshots if s.id_jugador_externo == current.id_jugador_externo and s.fecha > current.fecha and abs((s.fecha - target_date).days) <= tolerance_days]
        if not candidates:
            continue
        target = min(candidates, key=lambda item: abs((item.fecha - target_date).days))
        result.append(TemporalExample(current, current.fecha, target_date, target))
    return result
