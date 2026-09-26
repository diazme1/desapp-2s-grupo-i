# Research: WhoScored e integración con el refresh existente

## Alcance

Esta investigación cubre únicamente la localización de jugadores en WhoScored, la extracción de las siete métricas y la integración de esa operación como segunda etapa del refresh existente. No reemplaza Football-Data, no crea endpoints y no modifica la organización de `backend/src/players/`.

## Implementación mergeada inspeccionada

La fuente de verdad local es el módulo `backend/src/players/` actual:

- `players.controller.ts` maneja `POST /catalog/refresh`, exige JWT y delega en `ActualizarCatalogoService.ejecutar(query.ligaCodigo)`.
- `actualizar-catalogo.service.ts` obtiene el catálogo una vez, convierte errores del adapter de Football-Data en `ServiceUnavailableException` y luego llama a `players.guardarCatalogo`.
- `players.repository.ts` define `guardarCatalogo`, `listar` y `buscarPorId`.
- `typeorm-players.repository.ts` ejecuta `guardarCatalogo` en una transacción, upsertea ligas/equipos/jugadores por `proveedorId` y conserva el UUID de `JugadorEntity.id` existente.
- `jugador.entity.ts` usa `id uuid` como primary key; equipos y ligas tienen también UUID y foreign keys restrictivas.
- `players.module.ts` crea el `DataSource` real con `LigaEntity`, `EquipoEntity` y `JugadorEntity`, y registra `PLAYERS_REPOSITORY` y los servicios existentes.
- Los tests de integración usan PostgreSQL/Testcontainers, ejecutan las migraciones `1710000000000-CreateUsuarios` y `1727000000000-CreateCatalogoJugadores`, y ejercitan el endpoint con Supertest.

El resultado actual de `guardarCatalogo` solo contiene contadores. La decisión es extender ese resultado interno con una lista de contextos de jugadores guardados, sin exponerla públicamente. La lista se forma durante el mismo upsert y se devuelve solo después del commit:

```text
ResultadoGuardadoCatalogo
  ligas: number
  equipos: number
  jugadores: number
  jugadoresProcesados: Array<{
    idJugador: string
    nombreJugador: string
    equipoJugador: string
    ligaEquipoJugador: string
  }>
```

Se utilizará el `id` devuelto por `guardarJugador`, no el UUID temporal del objeto recibido desde Football-Data. Esto conserva el ID interno cuando un jugador existente se actualiza y evita una segunda consulta a Football-Data o una lectura indiscriminada de toda la tabla.

## Validación previa del transporte

El backend declara Node `22.11.x`, `fetch` y `AbortController` no deben asumirse solo por el entorno local del agente. Antes de fijar la implementación del adapter se debe ejecutar desde `backend` y el runtime real:

1. comprobar la versión efectiva de Node;
2. comprobar `typeof fetch === 'function'` y `typeof AbortController === 'function'`;
3. realizar una request mínima al recurso de búsqueda de WhoScored;
4. abortar una request controlada que supere el timeout;
5. observar y clasificar un error real de red.

La exploración anterior en Node `v24.6.0` confirmó las APIs, pero la request no resolvió `www.whoscored.com` por DNS del entorno. Eso no acredita conectividad del backend objetivo. La decisión preferida sigue siendo `fetch` nativo detrás de `WhoScoredTransport`; si Node `22.11.x` o el entorno no lo permiten, se documentará antes una alternativa con `https.request` nativo y la misma interfaz. No se agregará una dependencia sin justificarla.

## Decisión: acceso y formato de WhoScored

La investigación existente sobre el sitio oficial observó la siguiente secuencia:

1. `GET https://www.whoscored.com/search/?t={encodeURIComponent(nombreJugador)}` para obtener candidatos;
2. leer nombre, enlace de perfil y equipo candidato;
3. `GET https://www.whoscored.com/players/{playerId}/show/{slug}` para cada candidato compatible;
4. extraer del perfil el payload estructurado embebido en `require.config.params['args'].tournaments`.

El perfil es HTML, pero el adapter prioriza el bloque estructurado que contiene los registros de torneos, temporadas, equipos, jugador y métricas. No se parsean tablas visuales de presentación ni se usan endpoints XHR históricos no verificados. Si falta el payload estructurado, el resultado es `estructura_inesperada`; no se inventa un fallback visual silencioso.

Las observaciones de referencia se basan en las páginas públicas de búsqueda y perfil de Raphinha documentadas en la versión previa de esta research. La validación previa a implementación debe confirmar que el formato sigue disponible; los tests usarán fixtures sanitizados, nunca requests live.

## Decisión: matching determinístico y registro vigente

WhoScored representa los contextos estadísticos en registros de `tournaments`, con campos observados como `TournamentName`, `TournamentId`, `RegionName`, `SeasonId`, `StageId`, `TeamName`, `TeamId` y `PlayerId`. El contexto superior puede aportar `playerId`, `currentTeamId` y un identificador de temporada actual.

La selección aplica estrictamente este orden:

1. **Liga/torneo**: `TournamentName` normalizado coincide con `ligaEquipoJugador`.
2. **Equipo**: `TeamName` normalizado coincide con `equipoJugador`; si existen `TeamId` del candidato o del contexto, también deben ser compatibles.
3. **Temporada actual/vigente**: se usa el `SeasonId` explícito del contexto. Si no existe, se toma el mayor `SeasonId` numérico único entre los registros que ya pasaron liga y equipo. Si no puede determinarse un máximo único, no se elige arbitrariamente.
4. **Jugador**: `PlayerId` coincide con el candidato y el nombre normalizado coincide con `nombreJugador`.

El resultado es utilizable solo si queda exactamente un registro. Si quedan varios igualmente válidos, se devuelve `matching_ambiguo`; si no queda ninguno, `jugador_no_encontrado` o ausencia de registro compatible. Nunca se mezclan temporadas, equipos o competiciones y nunca se usa el primer resultado por conveniencia.

## Decisión: mapping y normalización

| WhoScored | Dominio | Significado |
|---|---|---|
| `Goals` | `goles` | goles del registro de competición/equipo seleccionado |
| `Assists` | `asistencias` | asistencias del registro |
| `shotsPerGame` / `SpG` | `tiros` | tiros por partido |
| `keyPassPerGame` / `KeyP` | `pasesClave` | pases clave por partido |
| `dribbleWonPerGame` / `Drb` | `regates` | regates por partido |
| `foulsPerGame` / `Fouls` | `faltasCometidas` | faltas cometidas por partido |
| `Rating` | `ratingWhoScored` | valoración numérica de WhoScored |

Los contadores son enteros no negativos y el rating es finito no negativo. `0` se mantiene como `0`. Campo ausente, `null`, vacío o inválido se convierte en `null`. Una identidad única con al menos una métrica válida produce `exito_parcial` si faltan otras métricas; todas las métricas ausentes producen `sin_estadisticas` y no se inserta.

## Decisión: timeout por request y deadline total

- timeout individual: `10_000 ms` por request, con `AbortController`;
- deadline total: `30_000 ms` por llamada a `EstadisticasJugadorService`;
- cada request usa el menor valor entre 10 segundos y el tiempo restante;
- no hay reintentos;
- al vencer el deadline se aborta cuando es posible, no se escribe y se devuelve `fuente_no_disponible`;
- una respuesta tardía no puede iniciar persistencia aunque el transporte no pueda abortarse físicamente.

El deadline de cada jugador no es un deadline global del refresh. El refresh itera secuencialmente y cada jugador obtiene su propia ventana de 30 segundos.

## Decisión: estadísticas parciales y atomicidad

**Estadísticas parciales persistibles** significa que el jugador está identificado de forma única, al menos una métrica es válida y los campos faltantes se guardan como `NULL` en una única observación completa desde el punto de vista transaccional.

**Persistencia parcial prohibida** significa que la escritura falla a mitad, deja una fila incompleta, deja una relación huérfana o escribe solo parte de la observación. El writer real debe insertar una fila de forma atómica en una transacción propia y devolver `error_persistencia` sin dejar residuos.

La segunda etapa comienza después del commit del catálogo. Por eso una falla de estadísticas nunca revierte jugadores, equipos o ligas ya persistidos.

## Decisión: puertos y adaptación al repository real

`EstadisticasJugadorService` ya define los ports `JugadorLookupPort`, `WhoScoredLookupPort` y `EstadisticasJugadorWriterPort`. Se conservan como contratos de dominio/aplicación sin moverlos a otra carpeta.

El mismo `PlayersRepository` real implementará las dos capacidades locales nuevas:

- `existePorId(idJugador)`: consulta puntual sobre `JugadorEntity`;
- `guardarEstadisticas(estadisticas)`: inserta una `EstadisticasJugadorEntity` en su propia transacción y devuelve el ID.

No se crea un repository alternativo. En `PlayersModule`, factories/tokens conectarán el objeto del repository con los ports que requieren interfaces TypeScript. La operación de estadísticas se registra como provider y `ActualizarCatalogoService` la recibe como dependencia.

## Decisión: persistencia y migración

La migración de catálogo existente crea `jugadores(id uuid primary key)`. Se agregará `backend/migrations/1790275835000-CreateEstadisticasJugadores.ts`, después de inspeccionar nuevamente la secuencia antes de implementarla. La tabla tendrá:

- PK UUID propia;
- `id_jugador uuid NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT`;
- seis métricas contador `integer NULL` con checks no negativos;
- `rating_whoscored double precision NULL` con check no negativo;
- índice por `id_jugador`;
- sin `UNIQUE(id_jugador)` para permitir observaciones históricas.

No se duplica nombre, equipo o liga y no se modifica la tabla Jugador.

## Decisión: procesamiento del refresh

El refresh procesa `jugadoresProcesados` secuencialmente, en orden determinista. La decisión prioriza baja carga y aislamiento ante fallos; no hay paralelismo ilimitado ni workers. Cada resultado se agrega así:

```text
exitosos  = exito_completo
parciales = exito_parcial
fallidos  = cualquier estado sin observación persistida
procesados = exitosos + parciales + fallidos
```

Estado global:

- `completo`: al menos un jugador y todos son `exito_completo`;
- `parcial`: existe `exito_parcial` o hay observaciones persistidas y también fallidos;
- `sin_estadisticas`: no hay ninguna observación persistible, incluso si la lista está vacía.

La respuesta conserva el resumen del catálogo y no incluye detalle individual. Un fallo de la etapa 1 mantiene exactamente el contrato HTTP actual y no inicia la etapa 2.

## Fixtures y tests

Los fixtures vivirán en `backend/test/unit/players/fixtures/whoscored/` y contendrán HTML mínimo sanitizado, payload esperado y casos de cero, ausencias, ambigüedad y estructura inesperada. Timeout, error de red y error de persistencia se simulan con fakes.

Los tests del refresh usarán un fake de `EstadisticasJugadorService` con IDs internos distintos. Deben cubrir catálogo completo, parcial, sin estadísticas, continuidad después de fallo de un jugador y ausencia de invocación cuando falla la etapa 1. El escenario SC-005 usará al menos 20 jugadores/fixtures controlados y verificará asociación independiente de las siete métricas.

Los tests de integración extenderán la app Testcontainers con la entidad/migración de estadísticas y sobrescribirán el service de estadísticas para no llamar a WhoScored. El test HTTP seguirá usando Supertest sobre `POST /catalog/refresh`.

## Alternativas descartadas

- HTML visual: descartado por fragilidad frente al payload estructurado.
- Endpoint histórico no verificado: descartado hasta contar con una validación de la versión actual.
- Consulta de toda la tabla de jugadores después del refresh: descartada porque la persistencia ya conoce los jugadores procesados.
- Segunda consulta a Football-Data: descartada por duplicar la primera etapa.
- Transacción global catálogo + WhoScored: descartada porque un proveedor externo no debe revertir catálogo confirmado.
- Concurrencia ilimitada: descartada por carga, determinismo y límites del proveedor.
- Tabla o entidad local duplicada de Jugador: descartada porque el catálogo ya está mergeado.
