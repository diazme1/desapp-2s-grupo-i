from __future__ import annotations

from .schema import PlayerSnapshot


def load_app(rows: list[dict[str, object]]) -> list[PlayerSnapshot]:
    return [PlayerSnapshot(id_jugador_externo=str(row["playerId"]), proveedor="app", temporada=str(row["season"]), fecha=row["date"], estadisticas=dict(row["statistics"]), granularidad=str(row.get("granularity", "date")), posicion=str(row.get("position", row.get("posicion", "unknown")))) for row in rows]  # type: ignore[arg-type]
