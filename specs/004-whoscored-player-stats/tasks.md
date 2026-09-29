---

description: "Task list for integrating WhoScored statistics into the catalog refresh"
---

# Tasks: Obtención y persistencia de estadísticas desde WhoScored

**Input**: Design documents from `/specs/004-whoscored-player-stats/`

**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), [contracts/refresh-catalogo.md](./contracts/refresh-catalogo.md)

**Scope**: conservar el scraper/adapter/servicio ya implementado y completar su integración como segunda etapa del `POST /catalog/refresh` existente. No se crea endpoint nuevo, no se duplica el catálogo y no se modifica Football-Data.

**Incremental rule**: T001-T026 permanecen completadas porque su implementación sigue siendo válida. Las tareas nuevas comienzan en la integración post-merge y no reabren el trabajo del adapter, matching, normalización, deadline, fixtures ni SC-005.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: conservar las comprobaciones iniciales ya realizadas sobre la feature y su estructura.

- [X] T001 Revisar `specs/004-whoscored-player-stats/spec.md`, `specs/004-whoscored-player-stats/plan.md` y `specs/004-whoscored-player-stats/data-model.md`, y registrar los límites funcionales y estructurales de la feature.
- [X] T002 [P] Inspeccionar `backend/src/players/` y confirmar la existencia de `domain/jugador.ts`, `persistence/jugador.entity.ts`, `players.repository.ts`, `persistence/typeorm-players.repository.ts` y `players.module.ts`, sin crear duplicados.
- [X] T003 [P] Inspeccionar `backend/migrations/` y registrar la secuencia disponible, incluyendo `1710000000000-CreateUsuarios.ts`, sin crear una migración provisional.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: conservar contratos, investigación técnica y dobles que ya habilitan la implementación existente.

- [X] T004 Definir y validar en `backend/src/players/estadisticas-jugador.service.ts` los contratos `JugadorLookupPort`, `EstadisticasJugadorWriterPort` y `WhoScoredLookupPort`, incluyendo lookup por `idJugador`, escritura de una entidad validada, entrada nombre/equipo/liga y resultado tipado.
- [X] T005 [P] Investigar y documentar en `specs/004-whoscored-player-stats/research.md` transporte, requests, payload estructurado, siete métricas, matching, timeout, deadline, fallas y fixtures de WhoScored.
- [X] T006 Implementar en `backend/test/unit/players/support/fake-players.repository.ts` el fake/mock de lookup y writer, con jugador existente/inexistente, registro de escrituras y error de escritura. Depende de T004.
- [X] T007 Validar desde `backend/` la versión de Node, `fetch`, `AbortController`, request mínima a WhoScored, abort por timeout y error de red; documentar alternativa `https.request` si corresponde en `specs/004-whoscored-player-stats/research.md`. Depende de T005.
- [X] T008 [P] Implementar en `backend/test/unit/players/support/fake-whoscored.adapter.ts` un fake configurable de `WhoScoredLookupPort` para match válido, no encontrado, ambiguo, fuente no disponible, respuesta parcial y estructura inesperada. Depende de T004.

**Checkpoint**: la cadena `T004 -> T006 -> T009` y la dependencia `T007 -> T015` ya están satisfechas; los dobles no requieren el catálogo físico.

---

## Phase 3: User Story 1 - Obtener y guardar estadísticas de un jugador identificado (Priority: P1) 🎯 MVP

**Goal**: mantener el caso de uso existente que identifica un jugador, normaliza siete métricas y persiste una observación mediante ports sustituibles.

**Independent Test**: ejecutar el servicio con fake de jugador local, fake de WhoScored y writer controlado; verificar métricas, `idJugador` y estado de éxito.

### Tests for User Story 1

- [X] T009 [US1] Escribir `backend/test/unit/players/estadisticas-jugador.service.spec.ts` con los fakes de T006 y T008 para lookup local, cuatro parámetros, adapter sustituible, escritura por `idJugador` y resultado tipado. Depende de T004, T006 y T008.
- [X] T010 [P] [US1] Crear fixtures controlados en `backend/test/unit/players/fixtures/whoscored/`, incluyendo búsqueda, candidato único/ambiguo, ceros, ausencias, estructura inesperada y datos para 20 jugadores distintos. Depende de T005.
- [X] T011 [P] [US1] Escribir `backend/test/unit/players/estadisticas-jugador.spec.ts` para invariantes de `EstadisticasJugador`, incluyendo `0` frente a `null` y ausencia total.
- [X] T012 [P] [US1] Escribir `backend/test/unit/players/whoscored-mapping.spec.ts` para parsing del payload estructurado y mapping de `Goals`, `Assists`, `SpG`, `KeyP`, `Drb`, `Fouls` y `Rating`. Depende de T010.

### Implementation for User Story 1

- [X] T013 [US1] Implementar `backend/src/players/domain/estadisticas-jugador.ts` con invariantes de ID, métricas, cero, `null` y observación no vacía. Depende de T011.
- [X] T014 [US1] Implementar `backend/src/players/adapters/whoscored/whoscored.types.ts` con tipos de transporte, payload, métricas y estados.
- [X] T015 [US1] Implementar `backend/src/players/adapters/whoscored/whoscored.adapter.ts` con transporte validado, requests, timeout, cancelación, parsing y normalización. Depende de T007, T010, T012 y T014.
- [X] T016 [US1] Implementar `backend/src/players/estadisticas-jugador.service.ts` con deadline de 30 segundos, lookup local, adapter, dominio, writer y estados completo/parcial. Depende de T004, T006, T008, T009, T013 y T015.
- [X] T017 [P] [US1] Escribir `backend/test/unit/players/estadisticas-jugador.service-zero.spec.ts` para conservar `0`, representar ausencia como `null` y persistir una observación parcial válida. Depende de T016.
- [X] T018 [US1] Crear `backend/test/unit/players/estadisticas-jugador-sc005.spec.ts` con al menos 20 `idJugador` y 20 casos controlados, verificando matching, siete métricas y no asociación cruzada. Depende de T016 y T017.

**Checkpoint**: US1 funciona offline y no requiere endpoint ni catálogo físico.

---

## Phase 4: User Story 2 - Evitar asociaciones incorrectas (Priority: P1)

**Goal**: rechazar coincidencias no encontradas o ambiguas cuando nombre, equipo, liga y temporada no dejan una identidad única.

**Independent Test**: ejecutar fixtures con discrepancias, candidatos múltiples y temporadas ambiguas; verificar estado clasificado y writer sin invocación.

- [X] T019 [P] [US2] Escribir `backend/test/unit/players/whoscored-matching.spec.ts` y `backend/test/unit/players/estadisticas-jugador.service-identity.spec.ts` para matching por liga, equipo, temporada y jugador, incluyendo ausencia y ambigüedad. Depende de T006, T008 y T016.
- [X] T020 [US2] Completar en `backend/src/players/adapters/whoscored/whoscored.adapter.ts` y `backend/src/players/estadisticas-jugador.service.ts` la selección única y estados `jugador_no_encontrado`/`matching_ambiguo`, sin fallback por nombre ni combinación de registros. Depende de T015 y T019.

**Checkpoint**: US1 continúa pasando y ningún matching inseguro persiste estadísticas.

---

## Phase 5: User Story 3 - Informar fallas y conservar integridad local (Priority: P1)

**Goal**: conservar la clasificación de fallas, el deadline, la distinción entre datos parciales y persistencia parcial, y la atomicidad lógica del caso de uso.

**Independent Test**: simular timeout, deadline, fuente no disponible, estructura inesperada, respuesta parcial, ausencia total y error de escritura sin modificar `Jugador`.

- [X] T021 [P] [US3] Escribir `backend/test/unit/players/whoscored-adapter-failures.spec.ts` para timeout, red, HTTP, estructura inesperada, campos inválidos y ausencia total con transporte fake. Depende de T015.
- [X] T022 [P] [US3] Escribir `backend/test/unit/players/estadisticas-jugador.service-partial.spec.ts` para **estadísticas parciales persistibles**: jugador identificado, una métrica válida, faltantes `null` y una observación atómica. Depende de T008 y T016.
- [X] T023 [P] [US3] Escribir `backend/test/unit/players/estadisticas-jugador.service-deadline.spec.ts` con tiempo controlado para superar el deadline simulado de 30 segundos; verificar finalización, `fuente_no_disponible`, ausencia de writer y ninguna promesa pendiente. Depende de T007 y T016.
- [X] T024 [P] [US3] Escribir `backend/test/unit/players/estadisticas-jugador.service-persistence-error.spec.ts` para **error de persistencia**, sin fila parcial/incompleta/huérfana y con `error_persistencia`. Depende de T006 y T016.
- [X] T025 [US3] Completar en `backend/src/players/adapters/whoscored/whoscored.adapter.ts` la clasificación de timeout, indisponibilidad, estructura y campos faltantes, preservando `0` y `null`. Depende de T020 y T021.
- [X] T026 [US3] Completar en `backend/src/players/estadisticas-jugador.service.ts` la coordinación timeout/deadline y estados `exito_parcial`, `sin_estadisticas` y `error_persistencia`, sin escritura parcial. Depende de T020, T022, T023, T024 y T025.

**Checkpoint**: T021-T024 no dependen de que US2 esté finalizada; solo T025/T026 comparten archivos con T020.

---

## Phase 6: User Story 4 - Integrar estadísticas en `POST /catalog/refresh` (Priority: P1)

**Goal**: conservar la primera etapa del catálogo y ejecutar después una segunda etapa secuencial con los jugadores realmente persistidos en ese refresh, sin endpoint nuevo.

**Independent Test**: ejecutar el refresh con varios jugadores y un fake de estadísticas; verificar IDs/contexto de la misma ejecución, continuidad por jugador, agregados completo/parcial/sin estadísticas y conservación del catálogo.

### Repository contract and persistence

- [X] T027 [US4] Extender `backend/src/players/players.repository.ts` con el resultado interno enriquecido de `guardarCatalogo`, que conserve `ligas`, `equipos` y `jugadores` y agregue `jugadoresProcesados[]` con `idJugador`, `nombreJugador`, `equipoJugador` y `ligaEquipoJugador`; agregar únicamente los métodos mínimos `existePorId(idJugador)` y el writer de estadísticas. Documentar que el resultado interno no se expone por HTTP.
- [X] T028 [US4] Extender `backend/src/players/persistence/typeorm-players.repository.ts` para que `guardarCatalogo` capture durante la misma transacción cada jugador guardado, use el UUID real devuelto por el upsert, asocie los nombres de equipo/liga ya procesados y retorne `jugadoresProcesados` únicamente después del commit. En el mismo repository adaptar `JugadorLookupPort.existePorId` y `EstadisticasJugadorWriterPort` para escribir una observación completa en una transacción propia, usando la entidad de T029 y sin tocar Jugador. No llamar nuevamente a Football-Data ni consultar toda la tabla. Depende de T027 y T029.
- [X] T029 [P] [US4] Crear `backend/src/players/persistence/estadisticas-jugador.entity.ts` con PK UUID propia, `idJugador uuid NOT NULL`, `ManyToOne` a `JugadorEntity`, `ON DELETE RESTRICT`, las siete métricas nullable e índice por `idJugador`; no duplicar nombre/equipo/liga y no agregar relación inversa a `JugadorEntity` salvo necesidad comprobada de TypeORM.
- [X] T030 [US4] **Compuerta de aprobación obligatoria**: inspeccionar exactamente los cambios necesarios en `backend/test/unit/players/support/fake-players.repository.ts`, `backend/test/unit/players/services.spec.ts`, `backend/test/integration/players/players-integration-app.ts` y `backend/test/integration/players/catalog.spec.ts`; enumerar por archivo la modificación mínima y detener la implementación para solicitar aprobación explícita antes de continuar. Ejecutar esta tarea antes de cualquier modificación de esos archivos; la aprobación no se presume por ejecutar `/speckit.implement`.
- [X] T031 [US4] Actualizar únicamente `backend/test/unit/players/support/fake-players.repository.ts` para el retorno enriquecido de `guardarCatalogo`, `existePorId` y el writer, sin eliminar escenarios previos. Requiere aprobación explícita completada en T030. Depende de T030.
- [X] T032 [US4] Agregar únicamente el archivo nuevo `backend/test/unit/players/players-repository.spec.ts` para verificar `jugadoresProcesados`, UUID real, no segunda consulta al source, lookup local, mapping entidad/dominio, asociación de escritura y atomicidad lógica. Depende de T028, T029 y T031.
- [X] T033 [US4] Inspeccionar nuevamente `backend/migrations/`, confirmar que `1727000000000-CreateCatalogoJugadores.ts` sigue siendo anterior y crear `backend/migrations/1790275835000-CreateEstadisticasJugadores.ts` (o un timestamp numérico concreto posterior si el orden cambió) con tabla, PK, FK a `jugadores(id)`, columnas nullable, checks no negativos e índice por `idJugador`; no modificar ni recrear Jugador. Depende de T029.

### Existing completed checks retained

- [X] T034 [P] [US4] Actualizar `specs/004-whoscored-player-stats/quickstart.md` solo cuando los comandos o prerrequisitos finales difieran de la implementación realizada.
- [X] T035 [P] [US4] Revisar `backend/src/players/` y `backend/migrations/` para confirmar que no se agregaron Jugador, Equipo, Liga, repositorios alternativos, carpetas arquitectónicas nuevas ni cambios a Football-Data.
- [X] T036 [US4] Ejecutar desde `backend` `npm run build`, `npm run lint` y `npm run test:unit` como validación base ya completada; la validación final post-integración se realizará en T047.

### Module and refresh orchestration

- [X] T037 [US4] Registrar en `backend/src/players/players.module.ts` `EstadisticasJugadorEntity`, `WhoScoredAdapter`, `EstadisticasJugadorService`, tokens/factories y el repository real como implementación de los ports; incluir la entidad en el `DataSource` sin crear módulos nuevos ni modificar `AppModule` salvo necesidad indispensable. Depende de T028, T029 y T033.
- [X] T038 [US4] Extender `backend/src/players/actualizar-catalogo.service.ts` para ejecutar la etapa existente, tomar `jugadoresProcesados` después del commit, iterar secuencialmente con `for...of`, invocar una vez `EstadisticasJugadorService` por jugador, continuar ante fallos y acumular el resultado agregado. Definir `completo` como al menos un jugador y todos `exito_completo`; `parcial` como observación persistida más fallo o cualquier `exito_parcial`; `sin_estadisticas` como ninguna observación persistible, incluido cero jugadores; garantizar `procesados = exitosos + parciales + fallidos`. No duplicar scraping/matching/normalización/persistencia, no llamar otra vez a Football-Data y no incluir estadísticas en la transacción global. Depende de T028 y T037.
- [X] T039 [US4] Actualizar `backend/test/unit/players/services.spec.ts` para catálogo + estadísticas completas, parciales, sin estadísticas, fallo de un jugador que no interrumpe a los siguientes, fallo de catálogo que no invoca estadísticas y cálculo `procesados = exitosos + parciales + fallidos`. Incluir explícitamente `jugadoresProcesados = []`: no invocar `EstadisticasJugadorService`, conservar el resumen de catálogo, devolver `procesados = 0`, `exitosos = 0`, `parciales = 0`, `fallidos = 0`, estado `sin_estadisticas` y HTTP exitoso cuando la primera etapa terminó correctamente. Usar fake/mock de `EstadisticasJugadorService`, no WhoScored real, conservar los escenarios existentes y requiere aprobación explícita completada en T030. Depende de T038.

### Response contract and HTTP surface

- [X] T040 [US4] Actualizar `backend/src/players/dto/refresh-catalogo-response.dto.ts` y crear `backend/src/players/dto/estadisticas-refresh-response.dto.ts` para documentar `estadisticas.estado`, `procesados`, `exitosos`, `parciales` y `fallidos`, conservando todos los campos actuales y sin exponer `jugadoresProcesados`. Depende de T038.
- [X] T041 [US4] Extender exactamente `backend/test/integration/players/catalog.spec.ts` con Supertest para verificar delegación del controller, HTTP 200 con estadísticas completas/parciales/sin estadísticas, y que ante cualquier falla de la primera etapa se conserva el contrato HTTP existente según el tipo de error: indisponibilidad/error de Football-Data mantiene el HTTP 503 actualmente implementado; un error de persistencia conserva exactamente el status y comportamiento actuales. En todos los casos de falla de la primera etapa, la etapa de estadísticas no se ejecuta. No agregar endpoints ni lógica al controller. Requiere aprobación explícita completada en T030. Depende de T030, T039 y T040.
- [X] T042 [US4] Actualizar únicamente `docs/postman/players-catalog.postman_collection.json` en la request existente de `POST /catalog/refresh`, agregando aserciones para `estadisticas`, `estado`, `procesados`, `exitosos`, `parciales` y `fallidos`; no crear una request nueva. Depende de T040.

### PostgreSQL/Testcontainers integration

- [X] T043 [US4] Extender `backend/test/integration/players/players-integration-app.ts` para registrar `EstadisticasJugadorEntity`, ejecutar la migración de estadísticas, truncar estadísticas antes de jugadores y sobrescribir `EstadisticasJugadorService` o sus ports con un fake; nunca llamar WhoScored real. Requiere aprobación explícita completada en T030. Depende de T030, T033 y T037.
- [X] T044 [US4] Crear `backend/test/integration/players/estadisticas-jugador.persistence.spec.ts` para FK `EstadisticasJugador -> Jugador`, relación 1-N, múltiples observaciones, asociación de múltiples jugadores, valores `0`, valores `NULL` y rechazo de jugador inexistente. Depende de T043.
- [X] T045 [US4] Crear `backend/test/integration/players/estadisticas-jugador.atomicity.spec.ts` para error de escritura, ausencia de filas parciales/huérfanas y conservación de Jugador; usar PostgreSQL/Testcontainers y el writer real. Depende de T043.
- [X] T046 [US4] Extender `backend/test/integration/players/catalog.spec.ts` para comprobar que el refresh persiste catálogo y continúa procesando cuando falla un jugador de estadísticas, que el estado global es parcial o `sin_estadisticas` según corresponda y que no se consulta Football-Data una segunda vez. Usar fake controlado del service de estadísticas y requiere aprobación explícita completada en T030. Depende de T030, T038, T041 y T043.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: validación final post-integración, arranque y revisión de alcance.

- [X] T047 Ejecutar desde `backend` `npm run build`, `npm run lint`, `npm run test:unit` y `npm run test:integration` después de T031-T046; registrar cualquier fallo sin eliminar ni reemplazar tests válidos. Depende de T032, T039, T041, T044, T045 y T046.
- [X] T048 Ejecutar desde `backend` `npm run start` después de T047, confirmar que la aplicación levanta sin error, esperar solo lo necesario para observar el startup, fallar si el proceso termina durante el arranque y finalizarlo de forma controlada. No modificar scripts ni agregar despliegue. Depende de T047.
- [X] T049 Revisar el diff final de `backend/src/players/`, `backend/migrations/` y `docs/postman/players-catalog.postman_collection.json`: confirmar que no se modificó `adapters/football-data/`, no se creó otro repository, no se agregó endpoint y no se reorganizó el módulo. Depende de T042, T046, T047 y T048.

---

## Dependencies & Execution Order

### Required chains

```text
T027 + T029 -> T028 -> T037
T029 -> T033 -> T037
T030 -> T031 -> T032
T037 -> T038 -> T039
T030 + T039 + T040 -> T041
T040 -> T042
T030 + T033 + T037 -> T043 -> T044/T045/T046
T039 + T041 + T044 + T045 + T046 -> T047 -> T048 -> T049
```

- `T027` define el contrato antes de implementar repository y tests.
- `T028` captura los jugadores de la misma ejecución y adapta lookup/writer; espera el contrato T027 y la entidad T029.
- `T029` agrega la entidad de forma independiente; T028/T033 esperan su definición.
- `T030` es la aprobación explícita obligatoria para modificar tests/fakes existentes y bloquea T031, T039, T041, T043 y T046.
- `T037` registra providers solo cuando contrato, repository, entidad y migración están listos; no depende de la aprobación porque modifica código productivo.
- `T038` es la única tarea que orquesta la segunda etapa en `ActualizarCatalogoService`.
- `T041` verifica el contrato HTTP sin modificar `players.controller.ts`.
- `T047` es la validación técnica final; `T048` es obligatoriamente posterior y ejecuta el startup smoke test.

### User Story dependencies

- **US1**: completada y no se reabre; sus contratos/fakes permiten seguir usando dobles.
- **US2**: completada y no se reabre; su matching es consumido por el adapter existente.
- **US3**: completada y no se reabre; sus estados son agregados por US4.
- **US4**: nueva integración P1; depende de las implementaciones existentes de US1-US3 y del catálogo real inspeccionado en T001-T003.

### Valid `[P]` opportunities

- T002 y T003 son paralelas después de T001.
- T005 es paralela a T002/T003 después de T001.
- T006 y T008 son paralelas después de T004.
- T010/T011 pueden ejecutarse en paralelo cuando sus dependencias estén listas.
- T029 puede ejecutarse en paralelo con T027 porque modifica una entidad independiente; T028 espera ambos.
- T031 no es paralela: está bloqueada por la aprobación explícita T030.
- T034 y T035 son comprobaciones ya completadas y no bloquean la implementación nueva.
- T041 y T042 no pueden marcarse `[P]` entre sí porque ambos validan/modifican el contrato de respuesta; se mantienen seriales para evitar inconsistencias.
- T044 y T045 pueden ejecutarse en paralelo después de T043 porque usan archivos de test distintos y ambos requieren la infraestructura integrada.

No se marca `[P]` ninguna tarea que consuma artefactos de otra, comparta archivo de producción o requiera el resultado de una tarea previa.

## Parallel Example: User Story 4

```text
Después de T027:

Task T029: entidad en backend/src/players/persistence/estadisticas-jugador.entity.ts

Después de T029:

Task T028: repository TypeORM en backend/src/players/persistence/typeorm-players.repository.ts

Después de T030 y con aprobación explícita:

Task T031: fake actualizado en backend/test/unit/players/support/fake-players.repository.ts

Después de T043:

Task T044: persistencia/FK en backend/test/integration/players/estadisticas-jugador.persistence.spec.ts
Task T045: atomicidad en backend/test/integration/players/estadisticas-jugador.atomicity.spec.ts
```

T029, T030, T033, T037 y T038 permanecen seriales por sus artefactos y dependencias.

## Implementation Strategy

### MVP conservado

US1-US3 ya están completadas y constituyen el MVP del caso de uso aislado. No deben reimplementarse.

### Incremental integration delivery

1. Ejecutar T027-T033 para adaptar el repository real, agregar entidad/migración y verificar la persistencia local.
2. Ejecutar T037-T039 para encadenar la segunda etapa y calcular el agregado sin tocar la primera etapa.
3. Ejecutar T040-T042 para documentar el contrato HTTP existente y actualizar Postman.
4. Ejecutar T043-T046 para validar PostgreSQL, atomicidad y refresh con múltiples jugadores/fallos.
5. Ejecutar T047-T049 como gate final.

### Protected scope

No crear tareas ni cambios para `backend/src/players/adapters/football-data/`, `catalogo-jugadores.service.ts`, `equipo.entity.ts`, `liga.entity.ts`, frontend, nuevos endpoints o nuevas carpetas arquitectónicas. `JugadorEntity` solo se toca si una relación inversa resulta estrictamente necesaria para TypeORM.

## Completion Report

- **Total de tareas**: 49.
- **Tareas completadas conservadas**: T001-T026 y T034-T036.
- **US1**: T009-T018, 10 tareas completadas.
- **US2**: T019-T020, 2 tareas completadas.
- **US3**: T021-T026, 6 tareas completadas.
- **US4**: T027-T033 y T037-T046, 17 tareas nuevas de integración.
- **Polish final**: T047-T049.
- **MVP**: US1-US3 ya completadas; el siguiente incremento ejecutable es T027-T039.
- **SC-005**: permanece cubierto por T018 con 20 jugadores/fixtures controlados.
- **Formato**: todas las tareas tienen checkbox, ID, etiquetas `[P]`/`[USn]` solo cuando corresponden y rutas concretas; las tareas de integración respetan las dependencias indicadas.
