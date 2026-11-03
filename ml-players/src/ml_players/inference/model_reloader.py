from __future__ import annotations

import threading
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .model_loader import LoadedModel, load_model


@dataclass(frozen=True)
class ModelState:
    model: LoadedModel | None = None
    version_modelo: str | None = None
    estado: str = "no_model_loaded"


class ModelManager:
    def __init__(self, model: LoadedModel | None = None) -> None:
        self._lock = threading.RLock()
        self._state = ModelState(model, model.version_modelo if model else None, "ready" if model else "no_model_loaded")

    def snapshot(self) -> ModelState:
        with self._lock:
            return self._state

    def predict(self, features: dict[str, float], position: str | None = None) -> dict[str, str] | None:
        state = self.snapshot()
        return None if state.model is None else state.model.predict(features, position)

    def swap(self, model: LoadedModel) -> None:
        with self._lock:
            self._state = ModelState(model, model.version_modelo, "ready")


class ModelReloader:
    """Carga el nuevo artefacto fuera del lock y hace swap en una sola operacion."""

    def __init__(self, manager: ModelManager, pointer_reader: Callable[[], dict[str, Any] | None], poll_interval_ms: int = 5000) -> None:
        self.manager = manager
        self.pointer_reader = pointer_reader
        self.poll_interval_ms = poll_interval_ms
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.last_error: str | None = None

    def check_once(self) -> bool:
        pointer = self.pointer_reader()
        if not pointer or pointer.get("versionModelo") == self.manager.snapshot().version_modelo:
            return False
        try:
            model = load_model(pointer["artifactPath"], pointer.get("manifestPath"))
            self.manager.swap(model)
            self.last_error = None
            return True
        except Exception as exc:  # preserve the previous loaded model
            self.last_error = str(exc)
            return False

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        def loop() -> None:
            while not self._stop.wait(self.poll_interval_ms / 1000):
                self.check_once()

        self._stop.clear()
        self._thread = threading.Thread(target=loop, name="ml-model-reloader", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)


def file_pointer_reader(path: str | Path) -> Callable[[], dict[str, Any] | None]:
    pointer_path = Path(path)

    def read() -> dict[str, Any] | None:
        if not pointer_path.exists():
            return None
        import json
        return json.loads(pointer_path.read_text(encoding="utf-8"))

    return read
