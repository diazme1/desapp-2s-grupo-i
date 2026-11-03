# Plan: Pronóstico de estadísticas y cotización a 15 días

## Flujo

```text
superadmin
   │ POST /ml-players/train
   ▼
NestJS ── adapter autenticado ──► FastAPI
                                      │ entrena y activa
                                      └── métricas + versión

usuario ──► NestJS ──► FastAPI predice estadísticas
                         NestJS aplica EstrategiaCotizacion
```

`ml-players/` contiene Python, FastAPI, datasets, entrenamiento, manifests y artefactos. `backend/src/ml-players/` contiene únicamente controller, servicio, DTOs y adapter NestJS. No se agregan entidades ni migraciones ML.

## Decisiones

- `POST /ml-players/train` es sincrónico: NestJS espera la respuesta de `POST /internal/train` y devuelve HTTP 200 cuando el modelo ya quedó activo.
- FastAPI recibe snapshots de entrenamiento, construye ejemplos temporales, ajusta regresión lineal, calcula métricas y persiste una versión.
- El puntero `active-model.json` se actualiza atómicamente. FastAPI intercambia el modelo en memoria después de cargarlo correctamente.
- FastAPI serializa los entrenamientos concurrentes con un lock en memoria para evitar carreras al actualizar el artefacto activo.
- Se utiliza un único modelo global de regresión lineal regularizada (Ridge). Las variables numéricas se estandarizan con parámetros del conjunto de entrenamiento y la posición se incorpora como one-hot con `unknown` como referencia (`goalkeeper`, `defender`, `midfielder`, `forward`, `unknown`); no se mantiene un modelo separado por posición.
- El manifest conserva los rangos numéricos del entrenamiento; FastAPI limita las entradas a esos rangos antes de inferir para evitar extrapolaciones extremas.
- La inferencia interna no identifica jugadores por ID: NestJS resuelve el jugador y envía a FastAPI las estadísticas actuales y la posición. Los `playerId` externos se conservan únicamente para agrupar snapshots de entrenamiento.
- No existen estados `ready_for_validation`, `approved` o `rejected`, ni endpoints de aprobación/rechazo.
- Python devuelve solo estadísticas. NestJS es el único responsable de calcular `cotizacionPredicha`.

## Estructura

```text
ml-players/
├── src/ml_players/snapshots/       # snapshots y orígenes
├── src/ml_players/dataset/         # ejemplos a 15 días y versionado
├── src/ml_players/training/        # regresión, métricas y persistencia
├── src/ml_players/inference/       # FastAPI, seguridad, carga y recarga
├── examples/                       # bodies de entrenamiento reproducibles
└── tests/fixtures/                 # fixture determinista

backend/src/ml-players/
├── fastapi-prediction.adapter.ts
├── ml-prediction.service.ts
├── ml-players.controller.ts
├── domain/estadisticas-predichas.ts
└── dto/
```

## Tests y documentación

- Python: temporalidad, entrenamiento, MAE/RMSE, baseline, versionado, seguridad, ausencia de modelo y recarga.
- NestJS: adapter de predicción y entrenamiento, autorización superadmin, respuesta 200/503 y cálculo de cotización.
- Frontend: cotización actual, cotización predicha y estado `null`.
- Actualizar README raíz, `ml-players/README.md`, `backend/.env.example`, Swagger, Postman y quickstart.
