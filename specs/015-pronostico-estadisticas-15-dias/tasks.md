# Tasks: Pronóstico de estadísticas y cotización a 15 días

El flujo de entrenamiento es sincrónico y no tiene aprobación, rechazo ni worker persistente. Python/FastAPI predice estadísticas; NestJS calcula la cotización.

## Python/FastAPI

- [X] T001 Implementar construcción temporal de ejemplos y versionado del dataset en `ml-players/src/ml_players/dataset/`.
- [X] T002 Implementar regresión lineal regularizada, estandarización y rangos de entrada, baseline, MAE/RMSE y normalización en `ml-players/src/ml_players/training/`.
- [X] T003 Implementar `POST /internal/train` en `ml-players/src/ml_players/inference/main.py`: validar snapshots, entrenar, persistir artefacto y manifest, actualizar `active-model.json`, cargar el modelo en memoria, serializar entrenamientos concurrentes y devolver métricas.
- [X] T004 Mantener `POST /internal/predict`, `GET /internal/health`, seguridad `X-ML-Internal-Token`, ausencia de modelo y recarga atómica en `ml-players/src/ml_players/inference/`.
- [X] T005 Eliminar worker, estados de validación y persistencia PostgreSQL ML de `ml-players/src/ml_players/`.
- [X] T013 Incorporar la posición general como variable one-hot del modelo global, propagarla desde los snapshots y agregar el ejemplo `ml-players/examples/training-body-30-players-positions-synthetic.json` con 30 jugadores y 120 snapshots.

## NestJS

- [X] T006 Extender `backend/src/ml-players/fastapi-prediction.adapter.ts` para invocar entrenamiento con timeout independiente.
- [X] T007 Agregar `POST /ml-players/train` en `backend/src/ml-players/ml-players.controller.ts`, protegido por JWT y `SuperadminGuard`, con DTOs y respuesta 200.
- [X] T008 Mantener `GET /players/:id/prediction` y el cálculo de `cotizacionPredicha` exclusivamente en `EstrategiaCotizacion`.

## Postman, tests y documentación

- [X] T009 Agregar el request de entrenamiento y validaciones de versión/métricas a `docs/postman/football-player-market.postman_collection.json`.
- [X] T010 Actualizar README raíz, `ml-players/README.md`, `backend/.env.example`, Docker Compose, Swagger, contratos y quickstart.
- [X] T011 Ejecutar build backend, tests focalizados, sintaxis Python, Compose y validación JSON de Postman.
- [ ] T012 Ejecutar `pytest`, tests frontend, integración y E2E cuando estén disponibles sus dependencias.

## Guardrails

- No crear un modelo para cotizaciones.
- No duplicar `EstrategiaCotizacion` en Python.
- No escribir `historial_cotizacion` ni `cotizacion_vigente`.
- No agregar aprobación, rechazo, espera de validación ni endpoints separados de métricas.
