from __future__ import annotations

import hashlib
import json


def dataset_version(rows: list[dict[str, object]], schema: list[str]) -> str:
    payload = json.dumps({"rows": rows, "schema": schema}, sort_keys=True, default=str).encode()
    return "dataset-" + hashlib.sha256(payload).hexdigest()[:16]
