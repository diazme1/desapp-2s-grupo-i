# Contrato interno FastAPI

FastAPI solo es accesible dentro de la red interna. Todas las requests requieren `X-ML-Internal-Token`; header ausente responde 401 e inválido 403.

## `POST /internal/train`

Request:

```json
{
  "origenDatos": "whoscored",
  "snapshots": [
    {
      "playerId": "external-player-1",
      "season": "2025",
      "date": "2025-01-01",
      "granularity": "match",
      "position": "forward",
      "statistics": {
        "goles": 1,
        "asistencias": 0,
        "tiros": 4,
        "pasesClave": 2,
        "regates": 3,
        "faltasCometidas": 1,
        "rating": 6.8
      }
    }
  ]
}
```

La request espera hasta completar el entrenamiento. FastAPI construye ejemplos temporales, ajusta regresión lineal, calcula métricas y guarda el artefacto antes de responder.

Los entrenamientos concurrentes se ejecutan de a uno para evitar carreras al actualizar el puntero activo.

Response HTTP 200:

```json
{
  "estado": "entrenado",
  "versionModelo": "model-20261102153000-a1b2c3d4",
  "versionDataset": "dataset-a1b2c3d4e5f6",
  "versionTransformaciones": "feature-standardization-v1-position-reference",
  "origenDatos": "whoscored",
  "cantidadSnapshots": 120,
  "cantidadEjemplos": 84,
  "metricas": {
    "validacion": { "mae": {}, "rmse": {} },
    "prueba": { "mae": {}, "rmse": {} },
    "baselinePrueba": { "mae": {}, "rmse": {} }
  }
}
```

El modelo queda disponible inmediatamente y el puntero se actualiza atómicamente. No existen estados de aprobación o rechazo.

## `POST /internal/predict`

FastAPI recibe estadísticas actuales y una posición general opcional, sin `playerId`. La identidad del jugador solo es necesaria en los snapshots de entrenamiento; durante la inferencia NestJS ya resolvió el jugador interno y envía sus datos. La posición se normaliza a una de cinco categorías; `unknown` es la referencia y las otras cuatro se codifican one-hot dentro del modelo global. El modelo es una regresión lineal regularizada y las variables numéricas se estandarizan con parámetros guardados en `manifest.json`. Antes de inferir, las entradas numéricas se limitan a los rangos observados durante el entrenamiento. No crea modelos separados por jugador o posición, no recibe pesos ni calcula cotizaciones.

Request mínima:

```json
{
  "fechaGeneracion": "2026-11-02T12:00:00Z",
  "fechaObjetivo": "2026-11-17",
  "position": "forward",
  "features": {
    "goles": "3",
    "asistencias": "2",
    "tiros": "5.000",
    "pasesClave": "2.000",
    "regates": "3.000",
    "faltasCometidas": "1.000",
    "ratingWhoScored": "7.500"
  }
}
```

Si no hay modelo cargado, responde HTTP 200 con `{"estado":"no_model_loaded"}` sin estadísticas. NestJS lo traduce a una respuesta pública con `cotizacionPredicha: null`.

## `GET /internal/health`

Devuelve `estado: "no_model_loaded"` o `estado: "ready"` y la versión cargada. Si falla una recarga posterior, conserva el modelo anterior.
