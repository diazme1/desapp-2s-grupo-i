from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import math

STATISTICS = ("goles", "asistencias", "tiros", "pasesClave", "regates", "faltasCometidas", "rating")
SOURCES = ("whoscored", "app", "synthetic")
GRANULARITIES = ("match", "round", "date", "period")


@dataclass(frozen=True)
class PlayerSnapshot:
    id_jugador_externo: str
    proveedor: str
    temporada: str
    fecha: date
    estadisticas: dict[str, float]
    granularidad: str = "date"
    posicion: str | None = None
    id_jugador: str | None = None

    def validate(self) -> None:
        if self.proveedor not in SOURCES:
            raise ValueError("Origen de snapshot no soportado")
        if self.granularidad not in GRANULARITIES:
            raise ValueError("La granularidad del snapshot no permite una prediccion temporal")
        if any(name not in self.estadisticas for name in STATISTICS):
            raise ValueError("Faltan estadisticas requeridas")
        for name in STATISTICS:
            value = self.estadisticas[name]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)) or value < 0:
                raise ValueError(f"La estadistica {name} debe ser finita y no negativa")
