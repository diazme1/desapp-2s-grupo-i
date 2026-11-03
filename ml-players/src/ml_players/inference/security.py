from __future__ import annotations

import os

from fastapi import Header, HTTPException


def internal_token() -> str:
    return os.getenv("ML_FASTAPI_INTERNAL_TOKEN", "dev-ml-token")


def require_internal_token(x_ml_internal_token: str | None = Header(default=None)) -> None:
    if x_ml_internal_token is None:
        raise HTTPException(status_code=401, detail="Header interno ausente")
    if x_ml_internal_token != internal_token():
        raise HTTPException(status_code=403, detail="Token interno invalido")
