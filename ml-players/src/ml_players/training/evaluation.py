from __future__ import annotations

import math
from collections import defaultdict
from typing import Iterable

from .normalization import STATISTICS


def mae(actual: Iterable[float], predicted: Iterable[float]) -> float:
    pairs = list(zip(actual, predicted))
    return sum(abs(a - p) for a, p in pairs) / len(pairs) if pairs else 0.0


def rmse(actual: Iterable[float], predicted: Iterable[float]) -> float:
    pairs = list(zip(actual, predicted))
    return math.sqrt(sum((a - p) ** 2 for a, p in pairs) / len(pairs)) if pairs else 0.0


def evaluate_statistics(actual: list[dict[str, float]], predicted: list[dict[str, float]], source: str) -> dict[str, object]:
    result: dict[str, object] = {"origenDatos": source, "mae": {}, "rmse": {}, "cantidadObservaciones": len(actual)}
    result["mae"] = {name: mae([row[name] for row in actual], [row[name] for row in predicted]) for name in STATISTICS}
    result["rmse"] = {name: rmse([row[name] for row in actual], [row[name] for row in predicted]) for name in STATISTICS}
    return result


def constant_baseline(features: list[dict[str, float]], actual: list[dict[str, float]]) -> list[dict[str, float]]:
    if not actual:
        return []
    averages = {name: sum(row[name] for row in actual) / len(actual) for name in STATISTICS}
    return [dict(averages) for _ in features]


def temporal_split(rows: list[dict[str, object]], train_ratio: float = 0.6, validation_ratio: float = 0.2) -> tuple[list[dict[str, object]], list[dict[str, object]], list[dict[str, object]]]:
    ordered = sorted(rows, key=lambda row: str(row["t"]))
    train_end = max(1, int(len(ordered) * train_ratio))
    validation_end = max(train_end, int(len(ordered) * (train_ratio + validation_ratio)))
    return ordered[:train_end], ordered[train_end:validation_end], ordered[validation_end:]
