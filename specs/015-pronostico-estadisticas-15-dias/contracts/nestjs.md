# Contrato público NestJS

El frontend solo consume NestJS y requiere JWT.

## `POST /ml-players/train`

Requiere JWT de superadmin. NestJS delega el entrenamiento a FastAPI y espera hasta su finalización.

La respuesta HTTP 200 incluye `estado: "entrenado"`, `versionModelo`, `versionDataset`, `versionTransformaciones`, `origenDatos`, cantidad de snapshots, cantidad de ejemplos y `metricas` con validación, prueba y baseline.

El endpoint no crea estados de aprobación o rechazo. Si el dataset es insuficiente responde 422; si FastAPI no está disponible o falla técnicamente responde 503.

## `GET /players/{id}/prediction`

NestJS obtiene la estrategia activa registrada y la utiliza tanto para leer la cotización oficial como para calcular la posible. El endpoint no recibe una estrategia por query param, por lo que ambas cotizaciones quedan alineadas con la configuración vigente.

La respuesta combina la cotización oficial existente con la posible:

```json
{
  "estado": "disponible",
  "cotizacionActual": "18.25",
  "cotizacionPredicha": "21.40",
  "prediccionDisponible": true,
  "fechaGeneracion": "2026-11-02T12:00:00.000Z",
  "fechaObjetivo": "2026-11-17",
  "versionModelo": "model-0001",
  "versionEstrategia": "ataque_decisivo@2",
  "origenDatos": ["whoscored"],
  "estadisticasPredichas": {
    "goles": "4",
    "asistencias": "3",
    "tiros": "28.400",
    "pasesClave": "11.200",
    "regates": "19.800",
    "faltasCometidas": "6.100",
    "ratingWhoScored": "7.420"
  }
}
```

La cotización predicha se calcula en NestJS aplicando `EstrategiaCotizacion` a las estadísticas recibidas. No se escribe en `cotizacion_vigente` ni `historial_cotizacion`.

Cuando falta modelo, datos o estrategia, responde HTTP 200:

```json
{
  "estado": "no_disponible",
  "cotizacionActual": "18.25",
  "cotizacionPredicha": null,
  "prediccionDisponible": false,
  "mensaje": "No hay un modelo disponible."
}
```

HTTP 503 queda reservado para timeout, error de red, FastAPI caído o fallo técnico no recuperable. El estado interno `no_model_loaded` nunca se expone.

Errores adicionales: 401 sin JWT, 404 para jugador inexistente y 422 para identificador o estrategia inválidos.
