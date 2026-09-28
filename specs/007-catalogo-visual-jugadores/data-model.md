# Data Model: Catálogo visual de jugadores

Este documento describe los datos que necesita la vista frontend. No crea entidades nuevas en la base de datos; representa respuestas del backend y estado de interacción de la pantalla.

## Jugador de catálogo

Representa un jugador persistido que puede aparecer en la grilla.

| Campo | Tipo | Requerido | Regla de uso |
|---|---|---:|---|
| `id` | string | Sí | Identificador estable utilizado para consultar el detalle. |
| `nombre` | string | Sí | Se muestra como nombre principal de la card y se usa en la búsqueda. |
| `nombreCompleto` | string o null | No | Puede complementar la identificación, pero no reemplaza a `nombre` en la card. |
| `fotoUrl` | string o null | No | Si falta o no es válida, se usa placeholder. El backend actual todavía no lo entrega. |
| `posicion` | string o null | No | Se muestra cuando existe. |
| `equipo` | Equipo | Sí | Se muestra y se usa en el filtro. |
| `liga` | Liga | Sí | Se muestra y se usa en el filtro. |
| `estadisticasDisponibles` | boolean o desconocido | No | Indicador opcional del listado. Si falta, la card mantiene una disponibilidad desconocida y el detalle se consulta bajo demanda. |

## Equipo

Representa el club asociado al jugador.

| Campo | Tipo | Requerido | Regla de uso |
|---|---|---:|---|
| `id` | string | Sí | Identificador del equipo. |
| `nombre` | string | Sí | Texto mostrado en la card y opción del filtro. |
| `nombreCorto` | string o null | No | Puede utilizarse como fallback visual si el nombre principal falta, aunque el contrato actual lo requiere. |
| `sigla` | string o null | No | Dato opcional para una presentación compacta. |
| `escudoUrl` | string o null | No | No es obligatorio para esta primera versión. |

## Liga

Representa la competencia asociada al equipo.

| Campo | Tipo | Requerido | Regla de uso |
|---|---|---:|---|
| `id` | string | Sí | Identificador de la liga. |
| `codigo` | string | Sí | Valor compatible con el filtro del backend, por ejemplo `PL`. |
| `nombre` | string | Sí | Texto mostrado en la card y opción del filtro. |
| `pais` | string o null | No | No es obligatorio para la card. |
| `emblemaUrl` | string o null | No | No es obligatorio para esta primera versión. |

## Estadísticas de jugador

Representa el bloque opcional que puede llegar en el detalle. No se crea ni se persiste desde el frontend.

| Campo | Tipo | Requerido | Regla de uso |
|---|---|---:|---|
| `id` | string o null | No | Identificador de la observación, útil si se muestran varias observaciones en el futuro. |
| `estado` | `completo`, `parcial` o `sin_estadisticas` | No | Si llega, guía el estado visual; el contrato actual no lo incluye y se infiere por la presencia de valores. |
| `goles` | number o null | No | `0` es un valor válido; `null` significa ausente. |
| `asistencias` | number o null | No | `0` es un valor válido; `null` significa ausente. |
| `tiros` | number o null | No | `0` es un valor válido; `null` significa ausente. |
| `pasesClave` | number o null | No | `0` es un valor válido; `null` significa ausente. |
| `regates` | number o null | No | `0` es un valor válido; `null` significa ausente. |
| `faltasCometidas` | number o null | No | `0` es un valor válido; `null` significa ausente. |
| `ratingWhoScored` | number o null | No | `0` es válido si el backend lo entrega; `null` significa ausente. |

### Derivación del estado

- `completo`: todos los campos esperados tienen valores no nulos, o el backend informa explícitamente ese estado.
- `parcial`: al menos un campo tiene valor y al menos otro campo está ausente, o el backend informa explícitamente ese estado.
- `sin_estadisticas`: el bloque no existe, es `null`, todos sus valores son ausentes, el backend informa ese estado o la consulta termina en una respuesta que no permite obtener datos.

## Filtros del catálogo

Estado local de la pantalla. No se persiste.

| Campo | Tipo | Valor inicial |
|---|---|---|
| `nombre` | string | Vacío |
| `ligaCodigo` | string o null | Todos |
| `equipoId` | string o null | Todos |
| `disponibilidadEstadisticas` | `todas`, `disponibles`, `no_disponibles` | `todas` |

Los filtros se combinan con una condición AND. La búsqueda por nombre no distingue mayúsculas de minúsculas y debe tolerar espacios iniciales o finales.

## Estados de la vista

### Estado del catálogo

- `cargando`: se solicita el listado por primera vez.
- `cargado`: existe una respuesta, aunque tenga cero jugadores.
- `error`: la consulta no se pudo completar; permite reintentar.

### Estado del resultado filtrado

- `con_resultados`: uno o más jugadores cumplen los filtros.
- `sin_resultados`: el catálogo está cargado, pero no hay coincidencias.
- `catalogo_vacio`: el backend respondió correctamente sin jugadores.

### Estado del detalle

- `cargando`: se solicita el jugador seleccionado.
- `con_estadisticas`: existen valores completos o parciales.
- `sin_estadisticas`: no hay bloque de estadísticas o todos los valores están ausentes.
- `error_recuperable`: la solicitud falló, se recibe 404 o el endpoint todavía no está disponible; se muestra mensaje y acción de retorno.

## Relaciones

```text
Liga 1 ──── N Equipo 1 ──── N Jugador de catálogo
Jugador de catálogo 1 ──── 0..N Observaciones de estadísticas disponibles para la vista
```

La relación de estadísticas es opcional para la experiencia frontend. La primera versión muestra la última observación recibida y no implementa historial. La ausencia de estadísticas no elimina al jugador del catálogo ni invalida sus datos base.
