"""Carga un modelo versionado y devuelve solamente estadisticas."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from decimal import Decimal, ROUND_HALF_UP

from ..training.positions import position_features

STATISTICS = ("goles", "asistencias", "tiros", "pasesClave", "regates", "faltasCometidas", "ratingWhoScored")
DEFAULT_SCALES = {"goles": 0, "asistencias": 0, "tiros": 3, "pasesClave": 3, "regates": 3, "faltasCometidas": 3, "ratingWhoScored": 3}


@dataclass(frozen=True)
class LoadedModel:
    version_modelo: str
    manifest: dict[str, Any]
    artifact: dict[str, Any]

    def predict(self, features: dict[str, float], position: str | None = None) -> dict[str, str]:
        coefficients = self.artifact.get("coefficients", [])
        intercept = self.artifact.get("intercept", [0] * len(STATISTICS))
        names = self.manifest.get("inputSchema", list(features))
        encoded_features = {**features, **position_features(position)}
        values = []
        normalization = self.manifest.get("featureNormalization", {})
        for name in names:
            value = float(encoded_features.get(name, encoded_features.get("rating", 0) if name == "ratingWhoScored" else 0))
            bounds = self.manifest.get("featureBounds", {}).get(name)
            if bounds:
                value = min(max(value, float(bounds["min"])), float(bounds["max"]))
            config = normalization.get(name)
            if config:
                value = (value - float(config["mean"])) / float(config["scale"] or 1.0)
            values.append(value)
        output: dict[str, str] = {}
        for index, name in enumerate(STATISTICS):
            row = coefficients[index] if index < len(coefficients) else []
            value = float(intercept[index] if index < len(intercept) else 0)
            value += sum(float(weight) * feature for weight, feature in zip(row, values))
            scale = int(self.manifest.get("scales", DEFAULT_SCALES).get(name, 3))
            value = max(0.0, value)
            if scale == 0:
                output[name] = str(int(Decimal(str(value)).quantize(Decimal('1'), rounding=ROUND_HALF_UP)))
            else:
                output[name] = f"{Decimal(str(value)).quantize(Decimal('1.' + '0' * scale), rounding=ROUND_HALF_UP):.{scale}f}"
        return output


def load_model(artifact_path: str | Path, manifest_path: str | Path | None = None) -> LoadedModel:
    artifact_path = Path(artifact_path)
    manifest_path = Path(manifest_path or artifact_path.with_name("manifest.json"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    raw = artifact_path.read_text(encoding="utf-8")
    try:
        artifact = json.loads(raw)
    except json.JSONDecodeError:
        try:
            import joblib  # type: ignore
            artifact = joblib.load(artifact_path)
        except Exception as exc:  # pragma: no cover - solo artefactos externos
            raise ValueError("No se pudo cargar el artefacto del modelo") from exc
    return LoadedModel(str(manifest["versionModelo"]), manifest, artifact)
