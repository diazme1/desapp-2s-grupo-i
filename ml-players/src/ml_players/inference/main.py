from __future__ import annotations

import os
import math
import re
from datetime import date, datetime
from pathlib import Path
from threading import Lock
from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

from .config import artifacts_dir, model_poll_interval_ms
from .model_loader import load_model
from .model_reloader import ModelManager, ModelReloader, file_pointer_reader
from ..snapshots.schema import PlayerSnapshot
from ..training.model_publisher import publish_active_model
from ..training.pipeline import load_snapshots_file, train_and_persist
from .security import require_internal_token


class PredictRequest(BaseModel):
    fechaGeneracion: datetime
    fechaObjetivo: str
    features: dict[str, str] = Field(default_factory=dict)
    position: str = "unknown"

    @field_validator("features")
    @classmethod
    def validate_decimal_features(cls, value: dict[str, str]) -> dict[str, str]:
        scales = {"goles": 0, "asistencias": 0, "tiros": 3, "pasesClave": 3, "regates": 3, "faltasCometidas": 3, "ratingWhoScored": 3}
        for name, item in value.items():
            if not isinstance(item, str):
                raise ValueError(f"La estadistica {name} debe ser un decimal serializado")
            if not math.isfinite(float(item)) or float(item) < 0:
                raise ValueError(f"La estadistica {name} debe ser finita y no negativa")
            scale = scales.get(name)
            if scale is None or not re.fullmatch(rf"\d+" if scale == 0 else rf"\d+\.\d{{{scale}}}", item):
                raise ValueError(f"La estadistica {name} no usa la escala declarada")
        return value


class PredictResponse(BaseModel):
    estado: str
    versionModelo: str | None = None
    versionDataset: str | None = None
    versionTransformaciones: str | None = None
    origenDatos: list[str] | None = None
    estadisticasPredichas: dict[str, str] | None = None
    estadisticasSchema: dict[str, dict[str, int]] | None = None
    fechaGeneracion: datetime | None = None
    fechaObjetivo: str | None = None


class TrainingSnapshotRequest(BaseModel):
    playerId: str
    season: str
    date: date
    statistics: dict[str, float]
    granularity: str = "date"
    position: str = "unknown"


class TrainingRequest(BaseModel):
    origenDatos: Literal["whoscored", "app", "synthetic"]
    snapshots: list[TrainingSnapshotRequest] = Field(default_factory=list)


class TrainingResponse(BaseModel):
    estado: str
    versionModelo: str
    versionDataset: str
    versionTransformaciones: str
    origenDatos: str
    cantidadSnapshots: int
    cantidadEjemplos: int
    metricas: dict[str, Any]


app = FastAPI(title="ML Players Inference", version="1.0.0")
file_reader = file_pointer_reader(Path(artifacts_dir()) / "active-model.json")


def active_pointer() -> dict[str, Any] | None:
    return file_reader()


def _initial_manager_from_active_pointer() -> ModelManager:
    configured = os.getenv("ML_MODEL_PATH")
    if configured:
        path = Path(configured)
        try:
            return ModelManager(load_model(path, path.with_name("manifest.json")))
        except Exception:
            pass
    pointer = active_pointer()
    if pointer:
        try:
            return ModelManager(load_model(pointer["artifactPath"], pointer.get("manifestPath")))
        except Exception:
            pass
    return ModelManager()


manager = _initial_manager_from_active_pointer()
training_lock = Lock()


reloader = ModelReloader(manager, active_pointer, model_poll_interval_ms())


@app.on_event("startup")
def startup() -> None:
    reloader.start()


@app.on_event("shutdown")
def shutdown() -> None:
    reloader.stop()


@app.get("/internal/health", dependencies=[Depends(require_internal_token)])
def health() -> dict[str, Any]:
    state = manager.snapshot()
    return {"estado": state.estado, "versionModeloCargada": state.version_modelo}


@app.post("/internal/predict", response_model=PredictResponse, response_model_exclude_none=True, dependencies=[Depends(require_internal_token)])
def predict(payload: PredictRequest) -> PredictResponse:
    state = manager.snapshot()
    if state.model is None:
        return PredictResponse(estado="no_model_loaded")
    return PredictResponse(
        estado="ready",
        versionModelo=state.version_modelo,
        versionDataset=str(state.model.manifest.get("versionDataset")) if state.model and state.model.manifest.get("versionDataset") else None,
        versionTransformaciones=str(state.model.manifest.get("versionTransformaciones")) if state.model and state.model.manifest.get("versionTransformaciones") else None,
        origenDatos=[str(item) for item in state.model.manifest.get("origenDatos", [])] if state.model else None,
        estadisticasPredichas=manager.predict({key: float(value) for key, value in payload.features.items()}, payload.position),
        estadisticasSchema={name: {"scale": int(scale)} for name, scale in (state.model.manifest.get("scales", {}) if state.model else {}).items()},
        fechaGeneracion=payload.fechaGeneracion,
        fechaObjetivo=payload.fechaObjetivo,
    )


@app.post("/internal/train", response_model=TrainingResponse, dependencies=[Depends(require_internal_token)])
def train(payload: TrainingRequest) -> TrainingResponse:
    with training_lock:
        try:
            snapshots = [
                PlayerSnapshot(
                    id_jugador_externo=item.playerId,
                    proveedor=payload.origenDatos,
                    temporada=item.season,
                    fecha=item.date,
                    estadisticas=item.statistics,
                    granularidad=item.granularity,
                    posicion=item.position,
                )
                for item in payload.snapshots
            ]
            if not snapshots:
                configured = os.getenv("ML_TRAINING_DATA_PATH")
                if not configured:
                    raise ValueError("Se requieren snapshots o ML_TRAINING_DATA_PATH")
                snapshots = load_snapshots_file(configured, payload.origenDatos)

            result = train_and_persist(snapshots, payload.origenDatos, artifacts_dir())
            loaded = load_model(result["artifactPath"], result["manifestPath"])
            publish_active_model(result["versionModelo"], result["artifactPath"], result["manifestPath"])
            manager.swap(loaded)
            result.pop("artifactPath", None)
            result.pop("manifestPath", None)
            return TrainingResponse(**result)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail="No se pudo completar el entrenamiento") from exc
