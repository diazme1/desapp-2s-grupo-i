# Implementation Plan: estadísticas WhoScored como segunda etapa del refresh

**Branch**: `004-whoscored-player-stats` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: La especificación exige completar el flujo existente de `POST /catalog/refresh` con una segunda etapa que obtenga y persista estadísticas de los jugadores producidos por la primera etapa.

## Summary

La implementación se integrará sobre el módulo `backend/src/players/` ya mergeado. La primera etapa del catálogo se conserva: `PlayersController` delega en `ActualizarCatalogoService`, que consulta `FootballDataAdapter` y persiste ligas, equipos y jugadores mediante `PlayersRepository` en una transacción.

La modificación mínima consiste en que la persistencia del catálogo devuelva internamente, además del resumen existente, los jugadores efectivamente guardados durante esa ejecución con su `id` UUID interno y el contexto nombre/equipo/liga. `ActualizarCatalogoService` utilizará esa lista después del commit para invocar, una vez por jugador, `EstadisticasJugadorService`. La respuesta pública conservará todos los campos actuales y agregará únicamente el resumen agregado de estadísticas; no expondrá el detalle individual.

La segunda etapa no participará de la transacción global del catálogo. Cada observación de estadísticas se escribirá atómicamente y un fallo de WhoScored o de persistencia de un jugador se contabilizará y permitirá continuar con los demás.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js `22.11.x` declarado en `backend/package.json`.

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL/`pg`, Jest 30, `ts-jest`, Supertest y Testcontainers ya presentes. No se incorpora una dependencia nueva de scraping.

**Actual runtime and transport**: El backend declara Node `22.11.x`. Antes de consolidar el transporte del adapter se debe repetir desde ese runtime la validación de `fetch`, `AbortController`, timeout, una request mínima a WhoScored y un error de red. El adapter conservará la interfaz de transporte sustituible; si `fetch` nativo no fuera viable, se documentará antes de implementarlo una alternativa mínima con `https.request` nativo. No se decide una librería nueva por anticipado.

**WhoScored access**: La investigación existente documenta la búsqueda `GET /search/?t={nombreCodificado}` y los perfiles `GET /players/{playerId}/show/{slug}`. El perfil se procesa desde su payload estructurado embebido en `require.config.params['args'].tournaments`; no se depende de tablas visuales ni se agregan endpoints de WhoScored no verificados.

**Timeout policy**: Cada request externa tiene timeout de 10 segundos con `AbortController`. `EstadisticasJugadorService` establece un deadline total de 30 segundos por jugador y pasa al adapter el tiempo restante. Al agotarse el deadline se aborta cuando es posible, no se persiste y se devuelve `fuente_no_disponible`. No hay reintentos automáticos.

**Storage**: La migración real del catálogo es `backend/migrations/1727000000000-CreateCatalogoJugadores.ts` y crea `jugadores.id uuid` como primary key. La migración prevista para estadísticas es `backend/migrations/1790275835000-CreateEstadisticasJugadores.ts`, con foreign key a `jugadores(id)`, siempre después de la migración existente. El nombre es concreto; si el orden de migraciones cambia antes de implementar, se debe inspeccionar nuevamente el directorio y conservar un timestamp concreto posterior al de Jugador.

**Actual catalog flow inspected**:

1. `PlayersController.actualizarCatalogo(@Query() query)` recibe el request autenticado en `POST /catalog/refresh` y llama `ActualizarCatalogoService.ejecutar(query.ligaCodigo)`.
2. `ActualizarCatalogoService` llama una vez a `FOOTBALL_DATA_ADAPTER.obtenerCatalogo(ligaCodigo)`.
3. Ante error de Football-Data lanza el `ServiceUnavailableException` existente; el controller conserva el HTTP 503.
4. Ante éxito llama a `PLAYERS_REPOSITORY.guardarCatalogo(catalogo)`.
5. `TypeOrmPlayersRepository.guardarCatalogo` persiste ligas, equipos y jugadores dentro de una única transacción TypeORM; los jugadores se upsertean por `proveedorId` y el `id` existente se conserva.
6. Hoy el repositorio devuelve solo `{ ligas, equipos, jugadores }`; hoy el service devuelve ese resumen junto con fuente, tiempos y fecha.
7. `RefreshCatalogoResponseDto` documenta esa respuesta mediante Swagger y la colección `docs/postman/players-catalog.postman_collection.json` verifica sus campos actuales.

**Project Type**: Backend web service. No se crea endpoint nuevo; se extiende la respuesta del endpoint existente.

**Constraints**: WhoScored es la única fuente externa de estadísticas; Football-Data conserva exclusivamente la primera etapa. No se crean capas arquitectónicas paralelas, no se duplica Jugador, no se mueven archivos, no se implementa scraping en el controller y no se deshace el catálogo si falla la segunda etapa.

## Constitution Check

*GATE: PASS antes de Phase 0. Se reevalúa después del diseño.*

- **I. Stack tecnológico — PASS**: se conservan TypeScript/NestJS, PostgreSQL, TypeORM, Jest, Supertest y Testcontainers existentes.
- **II. Arquitectura en capas — PASS**: `PlayersController -> ActualizarCatalogoService -> domain/repository`; `EstadisticasJugadorService -> WhoScoredAdapter`; la persistencia queda en `TypeOrmPlayersRepository` y la entidad TypeORM.
- **III. Modelo rico — PASS**: `EstadisticasJugador` mantiene sus invariantes mediante creación de dominio; el service no muta entidades directamente.
- **IV. Validación por nivel — PASS**: el DTO existente valida la forma del query; el service comprueba el jugador local y la viabilidad del caso de uso; el dominio valida métricas.
- **V. Tests y protección — PASS**: se agregan unit tests, integración PostgreSQL/Testcontainers y cobertura HTTP con Supertest. Los tests existentes no se eliminan; cualquier ajuste de mocks para el contrato extendido debe conservar sus escenarios.
- **VI. Definition of Done — PASS**: se actualizarán Swagger y la colección Postman por la modificación de la respuesta existente; la validación final incluye build, lint, tests y `npm run start` controlado.
- **VII. Idioma — PASS**: documentos y mensajes funcionales en español; identificadores sin acentos ni `ñ`.
- **VIII. Atomicidad — PASS**: la etapa de catálogo conserva su transacción; cada observación de estadísticas se inserta de forma atómica; no existe una transacción global que pueda revertir el catálogo por un fallo externo.
- **IX. Integraciones externas — PASS**: WhoScored permanece encapsulado en `adapters/whoscored`; una falla por jugador se clasifica y no rompe la actualización local ya confirmada.

## Phase 0: Investigación y decisiones técnicas

La investigación detallada está en [research.md](./research.md). Antes de implementar el adapter deben completarse la validación real del transporte y la confirmación de la estructura que utiliza la versión de WhoScored disponible para el backend.

Debe quedar documentado:

1. transporte efectivo, disponibilidad de `fetch` y `AbortController`, request mínima y error de red;
2. requests de búsqueda y perfil, formato de respuestas y fixtures sanitizados;
3. extracción de las siete métricas y diferencia entre `0` y `null`;
4. matching determinístico por liga, equipo, temporada vigente y jugador;
5. timeout de 10 segundos por request y deadline total de 30 segundos por operación;
6. clasificación de timeout, indisponibilidad, estructura inesperada, matching ambiguo y ausencia de métricas;
7. decisión de procesamiento secuencial de los jugadores del refresh.

### Regla determinística de registro vigente

El adapter aplicará, en este orden, los siguientes filtros sobre el payload estructurado de WhoScored:

1. torneo compatible con `ligaEquipoJugador`;
2. equipo compatible con `equipoJugador`, usando nombre y los identificadores externos disponibles;
3. temporada actual/vigente de esa competición, usando la marca explícita del contexto y, si no existe, el mayor `SeasonId` numérico único entre los registros ya filtrados;
4. jugador compatible con `nombreJugador` y el identificador del candidato.

Exactamente un registro permite continuar. Más de uno es `matching_ambiguo`; ninguno es `jugador_no_encontrado` o ausencia de registro compatible. No se combinan temporadas, equipos o competiciones.

## Integración de estadísticas en `POST /catalog/refresh`

### Flujo actual encontrado

El punto de entrada es `backend/src/players/players.controller.ts`, método `actualizarCatalogo`. El controller ya delega y no contiene lógica de catálogo más allá del request. `ActualizarCatalogoService` realiza la extracción, y `TypeOrmPlayersRepository.guardarCatalogo` persiste toda la primera etapa en una transacción.

La etapa actual devuelve contadores y no los objetos persistidos. El repositorio sí dispone, durante su transacción, de cada `JugadorEntity` guardado y de los mapas que resuelven el equipo y la liga. Es el punto correcto para conservar el contexto de los jugadores producidos sin volver a llamar a Football-Data.

### Flujo final propuesto

```text
POST /catalog/refresh?ligaCodigo=...
  -> PlayersController
  -> ActualizarCatalogoService.ejecutar
  -> FootballDataAdapter.obtenerCatalogo                 [etapa 1]
  -> PlayersRepository.guardarCatalogo                   [transacción catálogo]
  -> commit de ligas/equipos/jugadores
  -> jugadoresProcesados de esa misma ejecución
  -> EstadisticasJugadorService por cada jugador           [etapa 2]
  -> WhoScoredAdapter + normalización
  -> escritura atómica de cada EstadisticasJugador
  -> resumen global sin detalle individual
```

La modificación mínima del contrato `PlayersRepository` será ampliar el resultado interno de `guardarCatalogo` con `jugadoresProcesados`, cada uno con:

```text
idJugador: string       // JugadorEntity.id real y estable
nombreJugador: string
equipoJugador: string
ligaEquipoJugador: string
```

`TypeOrmPlayersRepository` construirá esa lista mientras guarda cada jugador: usará el `id` devuelto por el upsert y los nombres de las relaciones que ya está procesando. El retorno solo se produce después del commit de la transacción. `ActualizarCatalogoService` consumirá la lista internamente y excluirá ese campo de la respuesta HTTP.

No se llamará a `FootballDataAdapter` por segunda vez, no se reconstruirá el catálogo y no se ejecutará `listar()` sobre toda la tabla para recuperar los jugadores.

### Integración con `EstadisticasJugadorService`

El service existente conserva la operación interna:

```text
obtenerEstadisticasJugador(
  idJugador,
  nombreJugador,
  equipoJugador,
  ligaEquipoJugador,
)
```

`ActualizarCatalogoService` recibirá `EstadisticasJugadorService` como dependencia y solo preparará el contexto, invocará el caso de uso y agregará sus estados. No duplicará lookup local, matching, parsing, normalización ni escritura.

El service de estadísticas se conectará a:

- `PlayersRepository.existePorId`, extensión mínima del contrato actual para validar el `idJugador` real;
- `WhoScoredLookupPort`, implementado por `WhoScoredAdapter`;
- `EstadisticasJugadorWriterPort`, implementado por una operación del mismo `TypeOrmPlayersRepository` y no por otro repository.

Las interfaces existentes de los ports se conservarán; el módulo usará tokens/factories Nest para conectar interfaces TypeScript al repository y adapter concretos.

### Resultado global

La respuesta de `ActualizarCatalogoService` conservará `fuente`, `ligas`, `equipos`, `jugadores`, tiempos y `actualizadoEn`, y agregará:

```text
estadisticas:
  estado: completo | parcial | sin_estadisticas
  procesados: number
  exitosos: number       // exito_completo
  parciales: number      // exito_parcial, persistible
  fallidos: number       // estados sin observación persistida
```

Reglas:

- `completo`: hay jugadores procesados y todos tienen `exito_completo`;
- `parcial`: al menos una observación fue persistida (`exito_completo` o `exito_parcial`) y existe al menos un jugador fallido, o existe al menos un resultado `exito_parcial`;
- `sin_estadisticas`: ningún jugador produjo una observación persistible, incluido el caso de lista vacía.

La respuesta no contiene estados, IDs ni métricas individuales. `exito_parcial` significa estadísticas parcialmente disponibles pero una observación completa y atómica; `fallido` significa que no se persistió ninguna observación para ese jugador.

### Manejo de errores y límites transaccionales

- **Falla de etapa 1**: se conserva el comportamiento actual. La excepción de Football-Data sigue produciendo HTTP 503; un error de persistencia del catálogo conserva su propagación actual. La etapa 2 no se inicia.
- **Falla de un jugador en etapa 2**: se cuenta como `fallido`, no se elimina ni revierte Jugador/Equipo/Liga y se continúa con el siguiente.
- **Deadline**: el deadline de 30 segundos pertenece a cada invocación de `EstadisticasJugadorService`; si vence, no se escribe y se clasifica como `fuente_no_disponible`.
- **Persistencia de estadísticas**: cada escritura usa una operación transaccional propia y la FK real a Jugador. Una falla no deja fila incompleta, relación huérfana ni escritura parcial.
- **Transacción global**: el commit de la etapa 1 ocurre antes de iniciar estadísticas. Estadísticas no se agregan a la transacción global del catálogo.

### Procesamiento de múltiples jugadores

Se elegirá iteración secuencial `for...of`, en el orden de `jugadoresProcesados`. Es determinística, limita la carga sobre WhoScored, respeta el aislamiento por jugador y evita concurrencia ilimitada. No se agregan workers ni paralelismo en esta feature. El costo potencial de acumular hasta 30 segundos por jugador queda documentado; una estrategia de concurrencia limitada futura requeriría una decisión separada.

## Persistencia concreta

### Entidad y migración

Agregar `backend/src/players/persistence/estadisticas-jugador.entity.ts` y registrar la entidad en el `DataSource` construido por `PlayersModule`. La entidad tendrá:

- PK UUID propia `id`/`idEstadistica` según la convención elegida por las entidades existentes;
- `idJugador uuid NOT NULL` con `ManyToOne` a `JugadorEntity`, `ON DELETE RESTRICT`;
- dos contadores enteros nullable y no negativos: goles y asistencias; cuatro promedios decimales nullable y no negativos: tiros (`SpG`), pases clave (`KeyP`), regates (`Drb`) y faltas cometidas (`Fouls`);
- `ratingWhoScored double precision nullable` y no negativo;
- índice `idx_estadisticas_jugadores_id_jugador`;
- ninguna columna duplicada de nombre, equipo o liga;
- ningún `UNIQUE` sobre `idJugador`, porque cada ejecución exitosa agrega una observación.

La migración concreta será `backend/migrations/1790275835000-CreateEstadisticasJugadores.ts`, posterior a `1727000000000-CreateCatalogoJugadores.ts`. Antes de crearla se verificará nuevamente el orden real. No se modifica ni recrea `jugadores`.

### Repository integration

Extender `backend/src/players/players.repository.ts` y `backend/src/players/persistence/typeorm-players.repository.ts` sin crear otro repository:

- `guardarCatalogo` devuelve el resumen y `jugadoresProcesados` internos;
- `existePorId(idJugador)` consulta únicamente la existencia del jugador local;
- `guardarEstadisticas(estadisticas, context?)` crea y guarda una única entidad en una transacción propia y devuelve su ID.

Los nombres de los métodos se adaptarán a las interfaces existentes (`JugadorLookupPort` y `EstadisticasJugadorWriterPort`) para que el service no dependa de TypeORM. Los mocks existentes deberán agregar el retorno enriquecido y el fake de estadísticas; no se crea una segunda implementación del catálogo.

## Archivos a modificar y archivos protegidos

### Modificar o agregar en la implementación

- `backend/src/players/players.repository.ts`: resultado interno de catálogo, lookup local y writer de estadísticas.
- `backend/src/players/persistence/typeorm-players.repository.ts`: capturar jugadores guardados y persistir observaciones.
- `backend/src/players/persistence/estadisticas-jugador.entity.ts`: entidad y FK.
- `backend/src/players/estadisticas-jugador.service.ts`: solo ajustes de inyección/ports si el cableado real lo requiere; preservar matching, deadline, normalización y estados actuales.
- `backend/src/players/adapters/whoscored/whoscored.adapter.ts` y `whoscored.types.ts`: solo lo necesario después de la validación de transporte/investigación.
- `backend/src/players/actualizar-catalogo.service.ts`: orquestar etapa 2 y producir el agregado; conservar etapa 1 y sus errores.
- `backend/src/players/dto/refresh-catalogo-response.dto.ts` y un DTO anidado dentro de `backend/src/players/dto/`: documentar el resumen agregado en Swagger.
- `backend/src/players/players.module.ts`: registrar entidad, adapter, tokens/factories y service; incluir la entidad en el DataSource.
- `backend/migrations/1790275835000-CreateEstadisticasJugadores.ts`: tabla, FK, checks e índice.
- `docs/postman/players-catalog.postman_collection.json`: adaptar la aserción del refresh para el nuevo objeto `estadisticas`, sin crear una request nueva.
- tests existentes de `backend/test/unit/players/`, `backend/test/integration/players/` y fixtures nuevos, conservando todos los escenarios actuales.

### No modificar salvo integración mínima y justificada

- `backend/src/players/players.controller.ts`: no agregar endpoints ni lógica; solo puede actualizarse el tipo Swagger indirectamente mediante el DTO existente.
- `backend/src/players/catalogo-jugadores.service.ts`: no forma parte de la segunda etapa.
- `backend/src/players/adapters/football-data/`: no modificar.
- `backend/src/players/persistence/jugador.entity.ts`, `equipo.entity.ts`, `liga.entity.ts`: no recrear ni alterar tablas; la FK vive en la nueva entidad. Solo se agregaría una relación inversa si TypeORM la exige y no existe una alternativa equivalente.
- `backend/src/app.module.ts`: no requiere cambios salvo que el cableado real demuestre una necesidad.

No se crearán `application/`, `use-cases/`, `infrastructure/`, `repositories/`, `services/` ni otra carpeta arquitectónica.

## Testing strategy

### Unit tests

- dominio: invariantes, siete métricas, cero frente a `null`, ausencia total;
- adapter: fixtures de búsqueda/perfil, matching único, liga/equipo/temporada, ambiguo, no encontrado, estructura inesperada, timeout y mapping de las siete métricas;
- `EstadisticasJugadorService`: fake de jugador local, fake de `WhoScoredAdapter` sustituible y writer fake para éxito completo, parcial persistible, no encontrado, matching ambiguo, fuente no disponible, deadline, sin estadísticas y error de persistencia;
- `ActualizarCatalogoService`: catálogo completo + estadísticas completas, parciales, ninguna, fallo de un jugador que no interrumpe al siguiente, falla de catálogo que no invoca estadísticas y cálculo exacto de agregados. El fake debe devolver jugadores con IDs internos distintos y permitir verificar que no se hace una segunda consulta a Football-Data.

No se realizan llamadas reales a WhoScored en unit tests.

### Integration tests PostgreSQL/Testcontainers

Extender `backend/test/integration/players/players-integration-app.ts` para incluir `EstadisticasJugadorEntity` y la nueva migración, y truncar estadísticas antes de jugadores. Verificar:

- creación y persistencia del catálogo existente;
- FK de `estadisticas_jugadores` hacia `jugadores`;
- múltiples observaciones para un mismo jugador;
- asociaciones correctas para múltiples jugadores;
- persistencia del catálogo aun cuando el fake de estadísticas falle;
- escritura atómica y ausencia de filas huérfanas ante error controlado.

La app de integración debe sobrescribir `EstadisticasJugadorService` o su port con un fake controlado; no debe acceder a WhoScored.

### Controller/HTTP tests

Extender la suite existente con Supertest para comprobar que:

- `POST /catalog/refresh` sigue delegando en `ActualizarCatalogoService`;
- catálogo exitoso + estadísticas parciales o inexistentes devuelve HTTP 200;
- el cuerpo conserva los contadores actuales y agrega solo `estadisticas` agregado;
- falla de la primera etapa conserva el HTTP 503 y no ejecuta estadísticas;
- no existe endpoint adicional ni lógica de scraping en el controller.

### Validación final y startup smoke test

Desde `backend/`, en este orden:

```bash
npm run build
npm run lint
npm run test:unit
npm run test:integration
npm run start
```

La última verificación debe iniciar con el script existente, confirmar que la aplicación permanece levantada sin error durante el arranque, esperar solo lo necesario para observar la señal de startup y terminar el proceso de forma controlada. Si el proceso termina con error o no inicia, la validación falla. No se agrega despliegue ni se cambian scripts.

## Implementation order

1. Releer `spec.md`, `research.md`, migraciones y contratos reales; validar Node/fetch/AbortController/request/error desde el runtime backend.
2. Congelar fixtures y tipos del adapter; completar matching determinístico, normalización, timeouts y deadline sin llamar WhoScored desde tests.
3. Definir la extensión mínima de `PlayersRepository` para el resultado interno de jugadores procesados, lookup local y writer.
4. Implementar/ajustar entidad de dominio, adapter y `EstadisticasJugadorService` manteniendo sus ports sustituibles.
5. Ajustar `TypeOrmPlayersRepository` para devolver IDs reales después del commit y para guardar estadísticas atómicamente.
6. Crear la migración concreta y registrar la entidad, adapter, service y factories en `PlayersModule`.
7. Extender `ActualizarCatalogoService` con iteración secuencial, aislamiento de errores y agregado; actualizar DTO Swagger y colección Postman.
8. Ejecutar unit tests, integración PostgreSQL y HTTP con fakes; ajustar únicamente mocks/fixtures necesarios sin eliminar tests.
9. Ejecutar build, lint, tests completos y el startup smoke test con `npm run start`; revisar que el diff no toque Football-Data ni reorganice `players`.

## Constitution Check — Post-Design

*GATE: PASS.*

El diseño se apoya en la implementación mergeada del catálogo, conserva el endpoint y la transacción existentes, integra la segunda etapa en `ActualizarCatalogoService`, no duplica repositorios ni entidades de catálogo, mantiene WhoScored dentro de su adapter, define persistencia atómica por observación y contempla build/lint/tests/startup, Swagger y Postman.

## Complexity Tracking

No hay violaciones de la constitución que requieran justificación. La única extensión transversal es la respuesta agregada del endpoint existente y el contrato interno enriquecido del repository para transportar los jugadores de la misma ejecución.
