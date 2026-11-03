# ML Players

Este subdirectorio contiene el entrenamiento en Python y la inferencia interna FastAPI. Python predice únicamente estadísticas; no recibe pesos ni calcula cotizaciones.

## Desarrollo

```bash
cd ml-players
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[test]'
pytest
```

Variables principales: `ML_ARTIFACTS_DIR`, `ML_TRAINING_DATA_PATH`, `ML_FASTAPI_INTERNAL_TOKEN`, `ML_FASTAPI_TRAINING_TIMEOUT_MS` y `ML_MODEL_POLL_INTERVAL_MS`.

## FastAPI interno

```bash
PYTHONPATH=src uvicorn ml_players.inference.main:app --host 127.0.0.1 --port 8000
```

El servicio valida `X-ML-Internal-Token`. Si inicia sin modelo queda en `no_model_loaded`; responde HTTP 200 sin estadísticas y NestJS lo traduce a `no_disponible`. `POST /ml-players/train` envía snapshots a FastAPI, entrena sincrónicamente, guarda una versión, actualiza el puntero activo y devuelve las métricas. El timeout inicial del adapter es de 10 minutos y se configura con `ML_FASTAPI_TRAINING_TIMEOUT_MS`. Los cambios posteriores del puntero se cargan en segundo plano y se intercambian atómicamente; un fallo conserva el modelo anterior.

El fixture determinista del MVP está en `tests/fixtures/model-fixture/model.joblib` y `manifest.json`. Los artefactos reales se versionan junto con su manifest. La cotización se calcula siempre fuera de este proceso, en NestJS.

El modelo es único y global: usa regresión lineal regularizada, estandariza las variables numéricas, limita las entradas a los rangos observados durante el entrenamiento y normaliza la posición a `goalkeeper`, `defender`, `midfielder`, `forward` o `unknown`. `unknown` es la categoría de referencia y no se entrena un modelo separado por posición.

El body real de prueba basado en snapshots de WhoScored está en `examples/training-body-whoscored-2026.json`. Contiene datos de Lionel Messi (`playerId: 11119`) y genera 12 ejemplos temporales válidos con la tolerancia configurada. Para probar volumen y aprendizaje por posición sin presentar datos sintéticos como evidencia deportiva, usar `examples/training-body-30-players-positions-synthetic.json`, con 30 jugadores, cuatro posiciones y 120 snapshots.
