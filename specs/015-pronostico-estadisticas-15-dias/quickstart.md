# Quickstart

La guía general está en el [README.md raíz](../../README.md). El frontend se comunica solo con NestJS.

## Servicios

```bash
docker compose up --build
```

Compose inicia PostgreSQL, NestJS, `ml-fastapi` y frontend. Variables específicas: `ML_FASTAPI_BASE_URL`, `ML_FASTAPI_INTERNAL_TOKEN`, `ML_FASTAPI_TIMEOUT_MS`, `ML_FASTAPI_TRAINING_TIMEOUT_MS` (10 minutos iniciales), `ML_ARTIFACTS_DIR`, `ML_TRAINING_DATA_PATH` y `ML_MODEL_POLL_INTERVAL_MS`.

Para probar primero FastAPI desde Postman, usar la carpeta `07 - Pronóstico ML / 01 - FastAPI interno` con `fastApiBaseUrl=http://localhost:8000` y `mlInternalToken=dev-ml-token`. Ejecutar salud, entrenamiento y predicción en ese orden. El puerto se publica solo para desarrollo local y el header `X-ML-Internal-Token` sigue siendo obligatorio. Después probar `Entrenar modelo` y `Consultar predicción de jugador`, que pasan por NestJS.

## Entrenamiento manual

1. Iniciar sesión como superadmin en la colección Postman.
2. Ejecutar `07 - Pronóstico ML / Entrenar modelo`.
3. Confirmar HTTP 200, `estado: "entrenado"`, `versionModelo`, `versionDataset` y `metricas`.
4. Consultar `GET /players/{id}/prediction` sin query de estrategia y verificar que usa el modelo recién entrenado junto con la estrategia activa.

Para probar con datos reales, usar como body `ml-players/examples/training-body-whoscored-2026.json`. El archivo contiene snapshots de Lionel Messi tomados de WhoScored y no debe interpretarse como evidencia de precisión deportiva del modelo.

Para probar el volumen y el ajuste por posición, usar `ml-players/examples/training-body-30-players-positions-synthetic.json`: contiene 30 jugadores distintos, cuatro posiciones y 120 snapshots (cuatro por jugador), que generan ejemplos temporales válidos. Declarar `origenDatos: "synthetic"`; sus métricas solo sirven para validación técnica y no son evidencia de precisión deportiva.

## Estados esperados

- Sin modelo: la predicción pública responde HTTP 200 con `cotizacionPredicha: null`.
- Dataset insuficiente: el entrenamiento responde HTTP 422.
- FastAPI caído o timeout: NestJS responde HTTP 503.
- Durante una recarga posterior, un fallo conserva el modelo anterior.

## Tests

- Python: `pytest` para temporalidad, entrenamiento, métricas, seguridad y recarga.
- Backend: `npm run build` y `npm run test:unit`.
- Frontend: `npm test`.
- Contrato manual: colección [Postman](../../docs/postman/football-player-market.postman_collection.json).
