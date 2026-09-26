# Contrato HTTP: `POST /catalog/refresh`

## Punto de entrada

Se mantiene el endpoint existente autenticado:

```http
POST /catalog/refresh?ligaCodigo=PL
Authorization: Bearer <jwt>
```

No se agrega otro endpoint. `players.controller.ts` continúa recibiendo la request y delegando en `ActualizarCatalogoService`.

## Respuesta `200 OK`

La primera etapa del catálogo conserva sus campos actuales. Se agrega el resumen agregado de la segunda etapa:

```json
{
  "fuente": "Football-Data.org",
  "ligas": 5,
  "equipos": 100,
  "jugadores": 2500,
  "tiempoExtraccionMs": 126345,
  "tiempoExtraccion": "126.35 s",
  "actualizadoEn": "2026-09-24T12:00:00.000Z",
  "estadisticas": {
    "estado": "parcial",
    "procesados": 2500,
    "exitosos": 2400,
    "parciales": 50,
    "fallidos": 50
  }
}
```

`estadisticas.estado` admite:

- `completo`: todos los jugadores procesados tienen estadísticas completas persistidas;
- `parcial`: existe una observación persistida parcial o conviven observaciones persistidas y fallos;
- `sin_estadisticas`: no se persistió ninguna observación.

`exitosos` cuenta `exito_completo`, `parciales` cuenta `exito_parcial` persistible y `fallidos` cuenta estados sin observación persistida. La respuesta no contiene estados ni métricas individuales.

## Errores

- `401 Unauthorized`: se conserva la autenticación actual.
- `503 Service Unavailable`: se conserva para la indisponibilidad de Football-Data en la primera etapa.
- Los fallos de WhoScored, timeout, matching o persistencia de estadísticas no convierten en error HTTP el refresh si la primera etapa terminó correctamente; se reflejan en los contadores y el estado global.
- Si la primera etapa falla por otra razón, se conserva su comportamiento actual y no se inicia la segunda etapa.

## Límites

Este contrato no expone detalle individual, no permite iniciar la etapa de estadísticas por separado y no cambia los endpoints de lectura de jugadores.
