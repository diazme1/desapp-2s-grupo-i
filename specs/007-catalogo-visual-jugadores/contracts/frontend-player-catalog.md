# Contrato de integración: catálogo frontend de jugadores

Este contrato describe la información que consume el frontend y la compatibilidad esperada mientras el endpoint de estadísticas termina de implementarse. No constituye por sí solo una modificación del backend.

## Autenticación

- La pantalla se encuentra detrás de la autenticación existente.
- El cliente enviará el token Bearer disponible en la sesión para las consultas del catálogo y el detalle.
- Una respuesta `401` debe conservar el comportamiento global existente: invalidar la sesión y redirigir a login.

## Listado: `GET /players`

### Query compatible

| Parámetro | Tipo | Uso |
|---|---|---|
| `ligaCodigo` | string opcional | Filtrado por liga soportado actualmente por el backend. |

El frontend cargará el listado sin parámetro para construir la grilla y resolver en la vista la búsqueda por nombre y los filtros por equipo. Puede usar `ligaCodigo` en una futura optimización sin cambiar la experiencia.

### Respuesta base actual

```json
[
  {
    "id": "uuid",
    "nombre": "John Doe",
    "nombreCompleto": "John Doe",
    "posicion": "Midfielder",
    "fechaNacimiento": "1995-02-05",
    "nacionalidad": "Argentina",
    "equipo": {
      "id": "uuid",
      "nombre": "Manchester City FC",
      "nombreCorto": "Manchester City",
      "sigla": "MCI",
      "escudoUrl": null
    },
    "liga": {
      "id": "uuid",
      "codigo": "PL",
      "nombre": "Premier League",
      "pais": "England",
      "emblemaUrl": null
    }
  }
]
```

### Campos opcionales esperados para la feature

Para que las cards puedan indicar y habilitar correctamente el acceso a estadísticas sin hacer una consulta por jugador, el backend puede agregar sin romper el listado actual:

```json
{
  "fotoUrl": "https://example.test/player.jpg",
  "estadisticasDisponibles": true
}
```

Reglas de compatibilidad:

- Si `fotoUrl` falta o es `null`, el frontend muestra placeholder.
- Si `estadisticasDisponibles` es `true`, la card informa que puede mostrar estadísticas.
- Si `estadisticasDisponibles` es `false`, la card se mantiene visible, muestra “Estadísticas no disponibles” y puede abrir una ficha segura sin datos.
- Si el campo no llega mientras el backend está en transición, el frontend muestra la disponibilidad como desconocida/no disponible y permite consultar el detalle bajo demanda, sin realizar consultas masivas.

## Detalle: `GET /players/:id`

### Respuesta base actual

El backend actual devuelve los datos base de `JugadorResponseDto`. La vista debe seguir funcionando con esa respuesta aunque no incluya estadísticas.

### Respuesta actualizada

El backend actualizado devuelve un arreglo `estadisticas` en el detalle. El arreglo puede estar vacío cuando el jugador no tiene observaciones persistidas:

```json
{
  "id": "uuid",
  "nombre": "John Doe",
  "posicion": "Midfielder",
  "equipo": {
    "id": "uuid",
    "nombre": "Manchester City FC"
  },
  "liga": {
    "id": "uuid",
    "codigo": "PL",
    "nombre": "Premier League"
  },
  "estadisticas": [
    {
      "id": "uuid",
      "goles": 4,
      "asistencias": 2,
      "tiros": null,
      "pasesClave": 1.4,
      "regates": 0,
      "faltasCometidas": null,
      "ratingWhoScored": 7.2
    }
  ]
}
```

Reglas de interpretación:

- `estadisticas: []` significa que no hay estadísticas disponibles.
- Si existen varias observaciones, el frontend muestra la última observación recibida; el historial completo queda fuera de esta feature.
- Un número, incluido `0`, es un dato disponible.
- `null`, campo ausente o bloque `estadisticas: null` representa un dato no disponible.
- Si hay valores y ausencias dentro de una observación, el estado visual es parcial.
- Si no hay valores dentro de una observación, el estado visual es sin estadísticas.

## Errores y estados manejados por la UI

| Respuesta | Comportamiento esperado |
|---|---|
| `200` con jugadores | Mostrar catálogo y habilitar filtros. |
| `200` con lista vacía | Mostrar catálogo vacío. |
| `401` | Usar el manejador global de sesión y volver a login. |
| Error de red o `5xx` en listado | Mostrar error, mantener la posibilidad de reintentar y no mostrar cards inventadas. |
| `200` con `estadisticas: []` o sin bloque de estadísticas | Mostrar “Estadísticas no disponibles” y acción de regreso. |
| `404` en detalle | Tratar como estadísticas no disponibles o jugador no disponible, con retorno al catálogo. |
| Error de red, `5xx` o endpoint temporalmente ausente en detalle | Mostrar estado recuperable, no una pantalla vacía, y permitir volver. |

## Responsabilidad de esta feature

- El frontend implementa el consumo tolerante y la presentación.
- El backend debe mantener el contrato base actual y puede agregar los campos opcionales indicados.
- La implementación del endpoint de estadísticas queda fuera de este plan frontend y se coordina con la feature backend correspondiente.
