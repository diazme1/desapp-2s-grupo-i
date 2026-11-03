from __future__ import annotations

import json
import os
from pathlib import Path


def publish_active_model(version_modelo: str, artifact_path: str, manifest_path: str, pointer_path: str | None = None) -> Path:
    destination = Path(pointer_path or os.path.join(os.getenv("ML_ARTIFACTS_DIR", "artifacts"), "active-model.json"))
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(json.dumps({"versionModelo": version_modelo, "artifactPath": artifact_path, "manifestPath": manifest_path}), encoding="utf-8")
    temporary.replace(destination)
    return destination
