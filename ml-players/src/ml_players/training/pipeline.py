from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from ml_players.dataset.temporal_examples import build_examples
from ml_players.dataset.versioning import dataset_version
from ml_players.snapshots.schema import PlayerSnapshot

from .evaluation import constant_baseline, evaluate_statistics, temporal_split
from .linear_regression import fit_linear_regression
from .normalization import SCALES, STATISTICS
from .positions import POSITION_CATEGORIES, POSITION_FEATURES, position_features

MODEL_INPUT_SCHEMA = (*STATISTICS[:-1], "ratingWhoScored", *POSITION_FEATURES)
TRANSFORMATIONS_VERSION = "feature-standardization-v1-position-reference"
MODEL_FORMAT = "ml-players-ridge-regression-v1"
RIDGE_ALPHA = 1.0


def train_and_persist(
    snapshots: list[PlayerSnapshot],
    source: str,
    artifacts_root: str | Path,
) -> dict[str, Any]:
    if not snapshots:
        raise ValueError("Se requiere al menos un snapshot para entrenar")
    for snapshot in snapshots:
        snapshot.validate()

    examples = build_examples(snapshots)
    if len(examples) < 3:
        raise ValueError("Se requieren al menos tres ejemplos temporales válidos")

    rows = [_row_from_example(example) for example in examples]
    version_dataset = dataset_version(rows, list(MODEL_INPUT_SCHEMA))
    train_rows, validation_rows, test_rows = temporal_split(rows)
    if not train_rows or not test_rows:
        raise ValueError("El dataset no permite separar entrenamiento y prueba")
    feature_normalization = _fit_feature_normalization(train_rows)

    model = fit_linear_regression(
        [_features(row, feature_normalization) for row in train_rows],
        [_target(row) for row in train_rows],
        alpha=RIDGE_ALPHA,
    )
    validation_metrics = _evaluate(model, validation_rows, source, feature_normalization) if validation_rows else None
    test_metrics = _evaluate(model, test_rows, source, feature_normalization)
    baseline_predictions = constant_baseline(
        [_features(row) for row in test_rows],
        [_target(row) for row in train_rows],
    )
    baseline_metrics = evaluate_statistics(
        [_target(row) for row in test_rows],
        baseline_predictions,
        source,
    )
    now = datetime.now(timezone.utc)
    version_modelo = f"model-{now.strftime('%Y%m%d%H%M%S%f')}-{version_dataset.removeprefix('dataset-')[:8]}"
    root = Path(artifacts_root)
    model_dir = root / version_modelo
    model_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = model_dir / "model.json"
    manifest_path = model_dir / "manifest.json"
    artifact_path.write_text(
        json.dumps(
            {
                "format": MODEL_FORMAT,
                "versionModelo": version_modelo,
                "intercept": model.intercept,
                "coefficients": model.coefficients,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    manifest_path.write_text(
        json.dumps(
            {
                "versionModelo": version_modelo,
                "versionDataset": version_dataset,
                "coberturaTemporal": {
                    "desde": min(str(row["t"]) for row in rows),
                    "hasta": max(str(row["fechaObjetivo"]) for row in rows),
                },
                "origenDatos": [source],
                "versionTransformaciones": TRANSFORMATIONS_VERSION,
                "inputSchema": list(MODEL_INPUT_SCHEMA),
                "positionSchema": list(POSITION_CATEGORIES),
                "positionEncoding": "one_hot_drop_unknown",
                "featureNormalization": feature_normalization,
                "featureBounds": _fit_feature_bounds(train_rows),
                "inputPolicy": "clip_to_training_range",
                "modelParameters": {"type": "ridge", "alpha": RIDGE_ALPHA},
                "outputSchema": [*STATISTICS[:-1], "ratingWhoScored"],
                "scales": {**SCALES, "ratingWhoScored": SCALES["rating"]},
                "metricas": {
                    "validacion": validation_metrics,
                    "prueba": test_metrics,
                    "baselinePrueba": baseline_metrics,
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    return {
        "estado": "entrenado",
        "versionModelo": version_modelo,
        "versionDataset": version_dataset,
        "versionTransformaciones": TRANSFORMATIONS_VERSION,
        "origenDatos": source,
        "cantidadSnapshots": len(snapshots),
        "cantidadEjemplos": len(examples),
        "metricas": {
            "validacion": validation_metrics,
            "prueba": test_metrics,
            "baselinePrueba": baseline_metrics,
        },
        "artifactPath": str(artifact_path),
        "manifestPath": str(manifest_path),
    }


def load_snapshots_file(path: str | Path, source: str | None = None) -> list[PlayerSnapshot]:
    rows = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(rows, dict):
        rows = rows.get("snapshots", [])
    if not isinstance(rows, list):
        raise ValueError("El dataset de entrenamiento debe ser una lista de snapshots")
    return [
        PlayerSnapshot(
            id_jugador_externo=str(row["playerId"]),
            proveedor=source or str(row.get("source", "whoscored")),
            temporada=str(row["season"]),
            fecha=date.fromisoformat(str(row["date"])),
            estadisticas=dict(row["statistics"]),
            granularidad=str(row.get("granularity", "date")),
            posicion=str(row.get("position", row.get("posicion", "unknown"))),
        )
        for row in rows
    ]  # type: ignore[arg-type]


def _row_from_example(example: Any) -> dict[str, object]:
    return {
        "t": example.fecha_prediccion.isoformat(),
        "fechaObjetivo": example.fecha_objetivo.isoformat(),
        "features": {
            **_statistics(example.snapshot_inicial.estadisticas),
            **position_features(example.snapshot_inicial.posicion),
        },
        "target": _statistics(example.snapshot_objetivo.estadisticas),
    }


def _statistics(values: dict[str, float]) -> dict[str, float]:
    return {
        name: float(values["rating"] if name == "rating" else values[name])
        for name in STATISTICS
    }


def _features(row: dict[str, object], normalization: dict[str, dict[str, float]] | None = None) -> list[float]:
    values = row["features"]
    assert isinstance(values, dict)
    result: list[float] = []
    for name in MODEL_INPUT_SCHEMA:
        value = float(values.get(name, values.get("rating", 0.0) if name == "ratingWhoScored" else 0.0))
        config = (normalization or {}).get(name)
        if config:
            value = (value - config["mean"]) / config["scale"]
        result.append(value)
    return result


def _fit_feature_normalization(rows: list[dict[str, object]]) -> dict[str, dict[str, float]]:
    result: dict[str, dict[str, float]] = {}
    for name in (*STATISTICS[:-1], "ratingWhoScored"):
        values = [
            float(row["features"].get(name, row["features"].get("rating", 0.0) if name == "ratingWhoScored" else 0.0))
            for row in rows
        ]
        mean = sum(values) / len(values)
        variance = sum((value - mean) ** 2 for value in values) / len(values)
        result[name] = {"mean": mean, "scale": variance**0.5 or 1.0}
    return result


def _fit_feature_bounds(rows: list[dict[str, object]]) -> dict[str, dict[str, float]]:
    result: dict[str, dict[str, float]] = {}
    for name in (*STATISTICS[:-1], "ratingWhoScored"):
        values = [
            float(row["features"].get(name, row["features"].get("rating", 0.0) if name == "ratingWhoScored" else 0.0))
            for row in rows
        ]
        result[name] = {"min": min(values), "max": max(values)}
    return result


def _target(row: dict[str, object]) -> dict[str, float]:
    values = row["target"]
    assert isinstance(values, dict)
    return {name: float(values[name]) for name in STATISTICS}


def _evaluate(model: Any, rows: list[dict[str, object]], source: str, normalization: dict[str, dict[str, float]]) -> dict[str, object]:
    actual = [_target(row) for row in rows]
    predicted = [model.predict(_features(row, normalization)) for row in rows]
    return evaluate_statistics(actual, predicted, source)


