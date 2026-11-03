from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

STATISTICS = ("goles", "asistencias", "tiros", "pasesClave", "regates", "faltasCometidas", "rating")
SCALES = {"goles": 0, "asistencias": 0, "tiros": 3, "pasesClave": 3, "regates": 3, "faltasCometidas": 3, "rating": 3}


def normalize_prediction(values: dict[str, float]) -> dict[str, str]:
    result: dict[str, str] = {}
    for name in STATISTICS:
        value = max(0.0, float(values.get(name, 0)))
        quantizer = Decimal(1) if SCALES[name] == 0 else Decimal("1." + "0" * SCALES[name])
        decimal = Decimal(str(value)).quantize(quantizer, rounding=ROUND_HALF_UP)
        result[name] = format(decimal, "f")
    return result
