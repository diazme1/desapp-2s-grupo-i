from __future__ import annotations

import unicodedata

POSITION_CATEGORIES = (
    "goalkeeper",
    "defender",
    "midfielder",
    "forward",
    "unknown",
)

# `unknown` es la categoría de referencia; no se persiste como columna para
# evitar colinealidad con el intercepto del modelo.
POSITION_FEATURES = (
    "position_goalkeeper",
    "position_defender",
    "position_midfielder",
    "position_forward",
)


def normalize_position(value: str | None) -> str:
    normalized = _normalize_text(value or "")
    compact = normalized.replace(" ", "")
    if "goalkeeper" in normalized or "keeper" in normalized or "arquero" in normalized or "portero" in normalized or "gk" in compact:
        return "goalkeeper"
    if "forward" in normalized or "striker" in normalized or "delantero" in normalized or "fw" in compact or compact.startswith("st"):
        return "forward"
    if "midfielder" in normalized or "midfield" in normalized or "mediocampista" in normalized or compact.startswith("am") or compact.startswith("dm"):
        return "midfielder"
    if "defender" in normalized or "defensa" in normalized or "back" in normalized or compact.startswith("d"):
        return "defender"
    if compact.startswith("m"):
        return "midfielder"
    return "unknown"


def position_features(value: str | None) -> dict[str, float]:
    category = normalize_position(value)
    return {name: 1.0 if name == f"position_{category}" else 0.0 for name in POSITION_FEATURES}


def _normalize_text(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFD", value.lower())
        if unicodedata.category(character) != "Mn"
    ).strip()
