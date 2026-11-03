from __future__ import annotations

import os


def model_poll_interval_ms() -> int:
    return max(100, int(os.getenv("ML_MODEL_POLL_INTERVAL_MS", "5000")))


def artifacts_dir() -> str:
    return os.getenv("ML_ARTIFACTS_DIR", "artifacts")
