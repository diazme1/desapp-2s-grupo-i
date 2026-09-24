# Implementation Plan: Obtención y persistencia de estadísticas desde WhoScored

**Branch**: `004-whoscored-player-stats` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Especificación funcional para tomar un jugador existente, identificarlo en WhoScored, obtener siete estadísticas, normalizarlas y persistirlas asociadas mediante `idJugador`.

## Summary

La implementación se dividirá en una parte ejecutable en la rama actual y una integración posterior con el catálogo que se desarrolla en paralelo.

En la rama actual se implementarán el modelo de dominio `EstadisticasJugador`, los tipos y el adaptador de WhoScored, la investigación/fixtures que gobiernan su parsing, el matching nombre-equipo-liga, la normalización, los estados tipados del resultado y el servicio interno con puertos mínimos sustituibles por fakes.

La entidad TypeORM, la migración con foreign key física y el cableado contra el repositorio real de jugadores se integrarán después del merge del catálogo, porque esos archivos y la tabla `Jugador` todavía no existen en este checkout. No se crearán versiones provisionales o duplicadas para desbloquearlos.

La operación es exclusivamente interna: no se agregará endpoint HTTP, DTO de controller ni modificación de `players.controller.ts`.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22.11.x

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL/`pg`, Jest 30, `ts-jest` y Testcontainers 11 ya presentes. El acceso externo se encapsulará en `WhoScoredAdapter`; no se selecciona una librería adicional de scraping antes de la investigación documentada.

**Runtime/transport validation**: el proyecto declara Node `22.11.x` en `backend/package.json`. Antes de implementar `WhoScoredAdapter` se debe ejecutar desde el runtime real del backend una validación de `fetch`, `AbortController`, request GET a WhoScored, abort por timeout y clasificación de errores de red. La exploración local ejecutada con Node `v24.6.0` confirmó las APIs nativas, pero la request falló con `ENOTFOUND www.whoscored.com` por DNS del entorno; por eso esa validación debe repetirse bajo Node `22.11.x` y con la conectividad real del backend. Si `fetch` no estuviera disponible en el runtime objetivo, se utilizará `https.request` nativo detrás de la misma interfaz, sin agregar una dependencia.

**WhoScored access decision**: después de validar el runtime, el transporte será HTTP mediante el `fetch` nativo de Node 22, encapsulado detrás de un transporte sustituible del adapter; `GET /search/?t={nombreCodificado}` obtiene candidatos y `GET /players/{playerId}/show/{slug}` obtiene el perfil. El perfil entrega un payload estructurado embebido en `require.config.params['args'].tournaments`; el adapter leerá ese payload y no dependerá de tablas visuales HTML ni de selectores de presentación. No se usarán endpoints históricos no verificados.

**Timeout policy**: cada request externa tiene 10 segundos y usa `AbortController`; el servicio/caso de uso crea un deadline total de 30 segundos para todo el flujo WhoScored. Cada request usa el menor entre su timeout individual y el tiempo restante de la operación. Al vencer el deadline se aborta cuando es posible, se descartan respuestas tardías, no se invoca persistencia y se devuelve `fuente_no_disponible`. No hay reintentos automáticos.

**Storage**: PostgreSQL mediante TypeORM cuando exista la entidad real de `Jugador`. En la rama actual la persistencia se prueba a través de un writer fake; la tabla y la foreign key se agregan después del merge del catálogo. La migración existente inspeccionada es `backend/migrations/1710000000000-CreateUsuarios.ts`; no existe aún una migración de jugadores, por lo que no se crea una migración de estadísticas con timestamp provisional.

**Testing**: Jest con fixtures locales de respuestas de búsqueda/perfil, tests unitarios del dominio, adapter y servicio, y un test controlado de al menos 20 casos para SC-005. Los tests de integración TypeORM/PostgreSQL y de foreign key quedan condicionados a la disponibilidad de las entidades/migraciones reales del catálogo.

**Target Platform**: Backend NestJS ejecutado en Node.js localmente y en Docker.

**Project Type**: Backend web service, sin endpoint nuevo para esta feature.

**Constraints**: WhoScored es la única fuente externa; el matching exige nombre, equipo y liga; `0` es distinto de ausencia (`null`); no se actualiza ni elimina `Jugador` ante fallas; no se duplican nombre/equipo/liga en estadísticas; no se toca Football-Data ni se reorganiza `players`.

## Constitution Check

*GATE: PASS antes de Phase 0. Se reevalúa después del diseño.*

- **I. Stack tecnológico — PASS**: se usan TypeScript/NestJS, PostgreSQL y TypeORM existentes; la investigación no introduce una librería de scraping sin necesidad comprobada.
- **II. Arquitectura en capas — PASS**: el servicio interno coordina, el adapter encapsula WhoScored, el dominio no conoce NestJS/HTTP/PostgreSQL y la persistencia real queda detrás de contratos del módulo `players`.
- **III. Modelo rico — PASS**: `EstadisticasJugador` se construirá validando asociación y valores, sin setters públicos.
- **IV. Validación por nivel — PASS**: el servicio verifica `idJugador`, el adapter valida la identidad externa y el dominio valida métricas y ausencia total.
- **V. Tests y protección — PASS**: los tests del adapter usan fixtures; el caso de uso usa fakes; la integración real se agrega cuando exista el catálogo; no se modifican tests existentes.
- **VI. Definición de terminado — PASS**: el flujo interno se verifica con build, lint, tests y un smoke test de arranque mediante el `npm run start` existente; no hay endpoint, Swagger ni Postman nuevos.
- **VII. Idioma — PASS**: documentación y resultados funcionales en español; identificadores sin acentos ni `ñ`.
- **VIII. Operaciones transaccionales — PASS**: el writer real insertará de forma atómica y no tocará el registro de `Jugador`.
- **IX. Integraciones externas — PASS**: todo acceso a WhoScored vive en `adapters/whoscored`; sus fallas se convierten en resultados clasificados.

## Phase 0: Investigación técnica obligatoria de WhoScored

Esta fase debe completarse y documentarse antes de implementar `WhoScoredAdapter`. El documento de decisión es [research.md](./research.md), y los fixtures representan el contrato observado sin convertirlo en una dependencia live de CI.

Debe dejar resuelto:

1. mecanismo concreto de acceso, validación de `fetch`/`AbortController` desde el backend, requests de búsqueda y perfil, formato de cada respuesta y límites de timeout;
2. preferencia por datos estructurados embebidos en el perfil frente al HTML visual;
3. selección determinística por liga, equipo, temporada actual y jugador, sin combinar registros;
4. mapping de `Goals`, `Assists`, `TotalShots`, `KeyPasses`, `Dribbles`, `TotalTackles` y `Rating`;
5. coordinación entre timeout individual de 10 segundos y deadline total de 30 segundos, además del comportamiento ante indisponibilidad, estructura inesperada, métricas ausentes y payload bloqueado;
6. formato de fixtures HTML/JSON sanitizados y casos controlados para tests.

La investigación actual observa la búsqueda pública `https://www.whoscored.com/search/?t=Raphinha` y el perfil oficial [Raphinha](https://www.whoscored.com/players/300447/show/raphinha). El adapter dependerá de estos hallazgos documentados y no de una conjetura sobre selectores o endpoints antiguos.

## Project Structure

### Documentation

```text
specs/004-whoscored-player-stats/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md
```

### Source code and tests

```text
backend/src/players/
├── domain/
│   └── estadisticas-jugador.ts                         # implementar ahora
├── dto/                                                  # existente del catálogo; no modificar
├── persistence/
│   └── estadisticas-jugador.entity.ts                  # integrar después del catálogo
├── adapters/
│   └── whoscored/
│       ├── whoscored.adapter.ts                         # implementar ahora
│       └── whoscored.types.ts                           # implementar ahora
├── estadisticas-jugador.service.ts                     # implementar ahora, sin endpoint
├── players.repository.ts                                # contrato real del catálogo; extender después
├── persistence/typeorm-jugador.repository.ts             # integración posterior
└── players.module.ts                                     # registrar providers después

backend/test/
├── unit/players/
│   └── fixtures/whoscored/                               # fixtures controlados del adapter
└── integration/players/                                 # solo cuando exista el catálogo real
```

`jugador.ts`, `jugador.entity.ts`, `typeorm-jugador.repository.ts`, `players.repository.ts`, `players.module.ts`, `catalogo-jugadores.service.ts`, `actualizar-catalogo.service.ts` y `players.controller.ts` pertenecen al catálogo o al módulo existente. Si faltan en esta rama, no se recrean.

No se crearán `application/`, `use-cases/`, `infrastructure/`, `repositories/`, `services/` ni un segundo repositorio de jugadores.

## Design Decisions

### Caso de uso interno y puertos mínimos

`EstadisticasJugadorService` recibirá:

```text
obtenerEstadisticasJugador(
  idJugador,
  nombreJugador,
  equipoJugador,
  ligaEquipoJugador
)
```

El servicio verificará `idJugador` mediante un puerto mínimo de lookup del jugador y escribirá mediante un puerto mínimo de persistencia de estadísticas. Mientras no exista `players.repository.ts`, ambos contratos podrán vivir como interfaces internas del servicio y sus implementaciones serán fakes de test; no se creará un repositorio de producción alternativo. Al integrar el catálogo, esos puertos se conectarán al repositorio real previsto por `players`.

El resultado tipado distinguirá exactamente `exito_completo`, `exito_parcial`, `jugador_local_inexistente`, `jugador_no_encontrado`, `matching_ambiguo`, `fuente_no_disponible`, `estructura_inesperada`, `sin_estadisticas` y `error_persistencia`. Los resultados sin identidad segura nunca invocan al writer.

### Requests, matching y parsing

El adapter realizará la búsqueda pública por nombre, leerá candidatos con su nombre y enlace de equipo, y abrirá los perfiles necesarios para confirmar liga. El payload expone registros de `tournaments` con `TournamentName`, `TournamentId`, `RegionName`, `SeasonId`, `StageId`, `TeamName`, `TeamId` y `PlayerId`, además del contexto superior `playerId`/`currentTeamId`.

La selección será determinística y respetará este orden: (1) `TournamentName` compatible con `ligaEquipoJugador`; (2) `TeamName` y, cuando estén disponibles, `TeamId` compatibles con `equipoJugador`; (3) `SeasonId` de la temporada actual de esa competición, prefiriendo la marca explícita de temporada actual del contexto de la página y, si no existe, el mayor `SeasonId` numérico único entre los registros ya filtrados; (4) `PlayerId` y nombre compatibles con `nombreJugador`. Si quedan varios registros igualmente válidos, el resultado es `matching_ambiguo`; si no queda ninguno, es `jugador_no_encontrado` o ausencia de registro compatible. No se combinan estadísticas de distintas temporadas, equipos o competiciones, ni se elige arbitrariamente el primer resultado.

Mapping mínimo:

| Campo externo | Campo interno | Significado |
|---|---|---|
| `Goals` | `goles` | cantidad de goles del registro de competición/equipo seleccionado |
| `Assists` | `asistencias` | cantidad de asistencias |
| `TotalShots` | `tiros` | cantidad total de tiros, no tiros por partido (`SpG`) |
| `KeyPasses` | `pasesClave` | cantidad de pases que generan una ocasión según WhoScored |
| `Dribbles` | `regates` | cantidad de regates registrados |
| `TotalTackles` | `entradas` | cantidad total de entradas |
| `Rating` | `ratingWhoScored` | valoración numérica de WhoScored |

Un campo ausente o inválido se normaliza como `null`; un cero numérico se conserva como `0`. Si la identidad es única y al menos una métrica es válida, el resultado puede ser `exito_parcial` y se persiste una única observación transaccional con los faltantes en `null`; si ninguna lo es, es `sin_estadisticas`. Si falta la estructura que permite interpretar la respuesta, es `estructura_inesperada`.

### Modelo y persistencia

El dominio modelará una observación independiente con identificador propio, `idJugador` obligatorio y siete métricas nullable. No permitirá valores negativos, fraccionarios cuando el dato sea contador, rating no finito ni una observación con todas las métricas ausentes.

La entidad TypeORM y la tabla se crearán después del catálogo con columnas `idEstadistica`, `idJugador`, `goles`, `asistencias`, `tiros`, `pasesClave`, `regates`, `entradas` y `ratingWhoScored`. La foreign key utilizará el tipo y nombre reales de `JugadorEntity`; no se crea una tabla `Jugador` temporal. No habrá unicidad sobre `idJugador`, porque la relación es `Jugador 1-N EstadisticasJugador`.

La migración de estadísticas queda como integración posterior: la única migración visible hoy es `1710000000000-CreateUsuarios.ts` y no existe todavía una migración de jugadores con la que calcular un siguiente timestamp válido. Al integrar el catálogo se inspeccionará nuevamente `backend/migrations/` y se creará entonces el archivo con un nombre concreto, inmediatamente posterior a la migración real de jugadores. No se usa placeholder ni se agrega una migración incompleta en esta rama.

### Atomicidad y errores

El servicio nunca modifica ni elimina `Jugador`. Una falla de lookup local, fuente, matching, parsing, datos o vencimiento del deadline no produce escritura. Una respuesta parcial de estadísticas puede producir una observación completa desde el punto de vista transaccional, con campos faltantes en `null`. En cambio, un error del writer devuelve `error_persistencia`; el writer real deberá ejecutar una inserción atómica sin filas incompletas, huérfanas o parcialmente escritas. La caída o cambio de WhoScored solo afecta el resultado de esta operación.

## Implementation Sequence

1. Completar Phase 0 y registrar la validación real de Node/fetch/AbortController, mapping, matching, timeout individual, deadline total y fixtures de WhoScored.
2. Implementar `EstadisticasJugador`, tipos externos, parser/mapping, matching y estados del adapter en `backend/src/players/adapters/whoscored/`.
3. Implementar el servicio interno con lookup/writer sustituibles y cubrirlo con fakes, incluyendo los nueve estados de resultado.
4. Ejecutar la prueba controlada de al menos 20 casos para SC-005 y las suites unitarias sin depender del catálogo real.
5. Después del merge del catálogo, conectar los puertos al repositorio real, crear la entidad TypeORM, la migración con timestamp concreto, registrar providers y agregar integración PostgreSQL.
6. Ejecutar build, lint, tests unitarios y, cuando exista el esquema real, tests de integración. Ejecutar además `npm run start`, comprobar que el proceso levanta sin error y finalizarlo de forma controlada después del smoke test. Revisar que el diff solo toque estadísticas, WhoScored y la integración mínima.

## Final startup smoke test

La verificación final debe usar el script existente de `backend/package.json`:

```bash
npm run start
```

El smoke test debe iniciar la aplicación con la configuración local, comprobar que el proceso permanece levantado y no termina con error durante el arranque, y finalizarlo de forma controlada una vez obtenida la señal de arranque exitoso. Si el proceso termina con código de error o falla durante la inicialización, la verificación falla. No se agrega un mecanismo de despliegue ni se modifican scripts.

## Work split by catalog availability

### Implementable ahora

- `domain/estadisticas-jugador.ts`.
- `adapters/whoscored/whoscored.types.ts` y `whoscored.adapter.ts`.
- investigación técnica, parser/mapping, matching, normalización y clasificación de fallas.
- `estadisticas-jugador.service.ts` con contratos mínimos sustituibles.
- estados de resultado y manejo de métricas faltantes.
- fixtures y tests unitarios, incluido el escenario controlado de 20 casos.

### Implementable con fake/mock de Jugador

- validación de existencia de `idJugador`;
- escenario `jugador_local_inexistente`;
- pruebas del caso de uso, persistencia no invocada y resultados de error;
- writer fake para verificar asociación y atomicidad lógica sin PostgreSQL.

### Integración posterior al merge del catálogo

- conexión de lookup/writer con `players.repository.ts` y su implementación real;
- `persistence/estadisticas-jugador.entity.ts` con la relación física a `JugadorEntity`;
- migración concreta de tabla y foreign key, posterior a la migración real de jugadores;
- providers de `players.module.ts` que dependan de implementaciones presentes;
- tests de integración que requieran ambas entidades y PostgreSQL real.

## Constitution Check — Post-Design

*GATE: PASS.*

El diseño conserva la estructura obligatoria de `players`, mantiene el caso de uso fuera de HTTP, encapsula por completo WhoScored, no crea componentes duplicados del catálogo y deja aislados únicamente los puntos que requieren la rama del catálogo. La ausencia actual de la tabla `Jugador` no bloquea el desarrollo del adapter ni los tests con fakes.

## Complexity Tracking

No hay violaciones de la constitución que requieran justificación.
