# Data Model: estadísticas WhoScored y resultado del refresh

## Jugador existente

`Jugador` pertenece al catálogo ya implementado. La entidad real es `JugadorEntity` en `backend/src/players/persistence/jugador.entity.ts`:

| Campo | Regla |
|---|---|
| `id` / `idJugador` | UUID interno estable, primary key y referencia de estadísticas |
| `proveedorId` | identificador externo del catálogo, único; no se usa como FK de estadísticas |
| `nombre` | nombre local reutilizado como contexto de WhoScored |
| `equipo` | relación obligatoria a `EquipoEntity` |
| equipo.liga | relación obligatoria a `LigaEntity` |

La segunda etapa no modifica ni elimina este registro. El contexto que llega al caso de uso se obtiene del resultado de la misma persistencia de catálogo, no de una segunda consulta a Football-Data.

## Contexto de jugador procesado

Tipo interno transportado por `PlayersRepository.guardarCatalogo` después del commit:

```text
JugadorParaEstadisticas
  idJugador: string
  nombreJugador: string
  equipoJugador: string
  ligaEquipoJugador: string
```

`idJugador` es el `JugadorEntity.id` devuelto por el upsert. Los otros campos son los nombres ya asociados al jugador en la etapa 1. Este tipo no se expone en la respuesta HTTP.

## EstadisticasJugador — dominio

Representa una observación independiente obtenida de un único registro de WhoScored.

| Campo | Tipo lógico | Regla |
|---|---|---|
| `idEstadistica` | UUID | identificador propio de la observación |
| `idJugador` | UUID | obligatorio, no vacío y existente localmente |
| `goles` | entero o `null` | entero no negativo; `0` es válido |
| `asistencias` | entero o `null` | entero no negativo; `0` es válido |
| `tiros` | entero o `null` | tiros totales, no promedio por partido |
| `pasesClave` | entero o `null` | pases clave informados por WhoScored |
| `regates` | entero o `null` | regates informados por WhoScored |
| `faltasCometidas` | número decimal o `null` | faltas cometidas por partido (`Fouls`) |
| `ratingWhoScored` | número finito o `null` | rating numérico de WhoScored |

Invariantes:

- todos los contadores son enteros no negativos o `null`;
- el rating es finito, no negativo o `null`;
- `0` y `null` representan estados diferentes;
- las siete métricas en `null` no forman una observación persistible;
- una estadística parcial persistible tiene al menos una métrica válida y faltantes explícitos;
- el dominio no conoce NestJS, HTTP, TypeORM, PostgreSQL, HTML ni el transporte de WhoScored.

## Respuesta normalizada de WhoScored

```text
WhoScoredLookupResult
  estado:
    exito_completo | exito_parcial | jugador_no_encontrado |
    matching_ambiguo | fuente_no_disponible |
    estructura_inesperada | sin_estadisticas
  identidad?:
    playerIdExterno: string
    nombre: string
    equipo: string
    liga: string
  metricas?:
    goles: number | null
    asistencias: number | null
    tiros: number | null
    pasesClave: number | null
    regates: number | null
    faltasCometidas: number | null
    ratingWhoScored: number | null
  detalle?: string
```

La identidad solo es exitosa cuando el matching por liga, equipo, temporada y jugador deja un único registro. Un campo estadístico inválido se convierte en `null`; no se mezclan registros.

## Resultado del caso de uso individual

`EstadisticasJugadorService.obtenerEstadisticasJugador(idJugador, nombreJugador, equipoJugador, ligaEquipoJugador)` devuelve:

```text
ResultadoEstadisticasJugador
  estado:
    exito_completo | exito_parcial | jugador_local_inexistente |
    jugador_no_encontrado | matching_ambiguo |
    fuente_no_disponible | estructura_inesperada |
    sin_estadisticas | error_persistencia
  idJugador: string
  idEstadistica?: string
  metricas?: WhoScoredMetricas
  detalle?: string
```

Los estados de éxito incluyen una observación ya persistida. Los demás estados no implican escritura.

## Resultado interno de persistencia del catálogo

```text
ResultadoGuardadoCatalogo
  ligas: number
  equipos: number
  jugadores: number
  jugadoresProcesados: JugadorParaEstadisticas[]
```

`jugadoresProcesados` se genera durante el upsert dentro de la transacción de catálogo y solo está disponible al service después del commit. `ActualizarCatalogoService` lo consume y no lo copia al DTO público.

## Resultado global público del refresh

```text
estadisticas:
  estado: completo | parcial | sin_estadisticas
  procesados: number
  exitosos: number
  parciales: number
  fallidos: number
```

Conteo:

- `exitosos`: resultados individuales `exito_completo`;
- `parciales`: resultados individuales `exito_parcial`, que sí son persistibles;
- `fallidos`: cualquier estado sin observación persistida;
- `procesados`: suma de los tres contadores.

Estado global:

- `completo` si existe al menos un jugador y todos fueron `exito_completo`;
- `parcial` si hubo algún `exito_parcial` o hubo observaciones persistidas junto con fallidos;
- `sin_estadisticas` si no hubo ninguna observación persistible, incluso con cero jugadores.

No se incluyen IDs ni resultados individuales en `POST /catalog/refresh`.

## EstadisticasJugador — persistencia

Archivo previsto: `backend/src/players/persistence/estadisticas-jugador.entity.ts`.

| Columna | Tipo PostgreSQL | Restricción |
|---|---|---|
| `id` | `uuid` | primary key propia |
| `id_jugador` | `uuid` | `NOT NULL`, FK a `jugadores(id)`, `ON DELETE RESTRICT` |
| `goles`, `asistencias` | `integer` | nullable, check no negativo |
| `tiros`, `pases_clave`, `regates`, `faltas_cometidas` | `double precision` | promedios por partido, nullable, check no negativo |
| `rating_whoscored` | `double precision` | nullable, check no negativo |

Índice: `idx_estadisticas_jugadores_id_jugador`.

No hay `UNIQUE(id_jugador)`: cada ejecución exitosa agrega una observación nueva. No se duplican nombre, equipo ni liga. La migración concreta prevista es `backend/migrations/1790275835000-CreateEstadisticasJugadores.ts`, posterior a `1727000000000-CreateCatalogoJugadores.ts`, previa inspección final del orden.

El writer inserta una fila completa dentro de una transacción propia. Una falla no puede dejar fila incompleta, FK huérfana ni persistencia parcial.

## Puertos

```text
JugadorLookupPort
  existePorId(idJugador: string) -> boolean | { idJugador: string } | null

WhoScoredLookupPort
  obtenerEstadisticas(input, context) -> WhoScoredLookupResult

EstadisticasJugadorWriterPort
  guardar(estadisticas, context?) -> idEstadistica
```

El mismo `PlayersRepository` real implementará las capacidades locales mediante `existePorId` y `guardarEstadisticas`; Nest las conectará con factories/tokens. No se crea otro repository.

## Transiciones de datos faltantes

```text
WhoScored 0          -> dominio 0    -> columna 0
WhoScored positivo   -> dominio n    -> columna n
ausente/inválido     -> dominio null -> columna NULL
ninguna métrica      -> sin_estadisticas -> no insertar
```

Una falla de estadísticas no altera el catálogo y no elimina observaciones anteriores.
