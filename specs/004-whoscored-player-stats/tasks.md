---

description: "Task list for WhoScored player statistics feature"
---

# Tasks: Obtención y persistencia de estadísticas desde WhoScored

**Input**: Design documents from `/specs/004-whoscored-player-stats/`

**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Scope**: Jugador local existente → identificar en WhoScored → obtener siete estadísticas → normalizar → persistir por `idJugador`. La operación es un caso de uso/servicio interno; no se crea endpoint HTTP.

**Parallel catalog rule**: si un archivo del catálogo no existe en la rama actual, no se lo recrea. Se utilizan contratos mínimos, fixtures y fakes, y la conexión física se deja explícitamente para el post-merge.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar el estado del checkout, las convenciones existentes y los límites de la feature.

- [X] T001 Revisar `specs/004-whoscored-player-stats/spec.md`, `specs/004-whoscored-player-stats/plan.md` y `specs/004-whoscored-player-stats/data-model.md`, y registrar en el trabajo los límites funcionales y estructurales de la feature.
- [X] T002 [P] Inspeccionar `backend/src/players/` y confirmar si existen `domain/jugador.ts`, `persistence/jugador.entity.ts`, `players.repository.ts`, `persistence/typeorm-jugador.repository.ts` y `players.module.ts`; si faltan, documentarlo sin crear duplicados.
- [X] T003 [P] Inspeccionar `backend/migrations/` y registrar la secuencia disponible, incluyendo `1710000000000-CreateUsuarios.ts`, sin crear todavía una migración que dependa de una tabla `Jugador` ausente.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir contratos, validar el transporte y preparar dobles de test antes de implementar el adapter o el servicio.

**⚠️ CRITICAL**: T004 debe completarse antes de T006, T008 y T009. T005 debe completarse antes de T007 y T015. T007 debe completarse antes de la implementación concreta del adapter.

- [X] T004 Definir y validar en `backend/src/players/estadisticas-jugador.service.ts` los contratos mínimos `JugadorLookupPort`, `EstadisticasJugadorWriterPort` y `WhoScoredLookupPort`, incluyendo lookup por `idJugador`, escritura de una entidad validada, entrada nombre/equipo/liga y el resultado tipado de la operación; si existe `players.repository.ts`, documentar el punto exacto donde se conectará sin duplicarlo.
- [X] T005 [P] Investigar y documentar en `specs/004-whoscored-player-stats/research.md` el transporte `fetch` de Node 22, requests de búsqueda y perfil, formatos de respuesta, extracción de las siete estadísticas, matching determinístico, timeout individual, deadline total, fallas y formato de fixtures.
- [X] T006 Implementar en `backend/test/unit/players/support/fake-players.repository.ts` el fake/mock de `JugadorLookupPort` y `EstadisticasJugadorWriterPort` definido en T004; debe permitir jugador existente/inexistente, registrar escrituras y simular error de escritura. Depende de T004 y no es código de producción.
- [X] T007 Validar desde `backend/` y registrar en `specs/004-whoscored-player-stats/research.md` la versión de Node del proyecto, disponibilidad de `fetch` y `AbortController`, una request GET mínima a WhoScored, abort por timeout y comportamiento ante error de red; si `fetch` nativo no es viable, documentar la alternativa `https.request` nativa antes de T015. Depende de T005.
- [X] T008 Implementar en `backend/test/unit/players/support/fake-whoscored.adapter.ts` un fake/mock sustituible compatible con `WhoScoredLookupPort`, con escenarios configurables de match válido, jugador no encontrado, matching ambiguo, fuente no disponible, respuesta parcial y estructura inesperada. Depende de T004.

**Checkpoint**: contratos, validación previa de transporte y dobles de Jugador/WhoScored están disponibles. La cadena `T004 → T006 → T009` queda preparada sin paralelizar tareas dependientes.

---

## Phase 3: User Story 1 - Obtener y guardar estadísticas de un jugador identificado (Priority: P1) 🎯 MVP

**Goal**: Obtener una coincidencia única, normalizar las siete estadísticas y devolver/persistir una observación asociada al `idJugador` correcto mediante contratos sustituibles.

**Independent Test**: Con un fake que informa un jugador local existente, un fake de WhoScored con match único y un writer controlado, ejecutar el servicio y verificar las siete métricas, la asociación a `idJugador` y el estado de éxito.

### Tests for User Story 1

> Los tests se escriben antes de la implementación correspondiente. T009 usa explícitamente los fakes de T006 y T008; por eso no se marca `[P]`.

- [X] T009 [US1] Escribir `backend/test/unit/players/estadisticas-jugador.service.spec.ts` usando los fakes de T006 y T008 para verificar lookup de jugador existente, recepción de los cuatro parámetros, invocación del adapter sustituible, escritura por `idJugador` y resultado tipado de éxito. Depende de T004, T006 y T008.
- [X] T010 [P] [US1] Crear los fixtures controlados de WhoScored en `backend/test/unit/players/fixtures/whoscored/`, incluyendo búsqueda, candidato único, candidato ambiguo, valores cero, campos ausentes, estructura inesperada y datos para 20 jugadores distintos. Depende de T005.
- [X] T011 [P] [US1] Escribir `backend/test/unit/players/estadisticas-jugador.spec.ts` para las invariantes de `EstadisticasJugador`: `idJugador` obligatorio, contadores enteros no negativos, rating válido, observación no vacía y distinción entre `0` y `null`.
- [X] T012 [P] [US1] Escribir `backend/test/unit/players/whoscored-mapping.spec.ts` con los fixtures de T010 para verificar normalización, parsing del payload estructurado y mapping de `Goals`, `Assists`, `TotalShots`, `KeyPasses`, `Dribbles`, `TotalTackles` y `Rating`. Depende de T010.

### Implementation for User Story 1

- [X] T013 [US1] Implementar `backend/src/players/domain/estadisticas-jugador.ts` con el modelo de dominio independiente de NestJS, HTTP, TypeORM y PostgreSQL; debe preservar valores cero, representar ausencias como `null` y rechazar observaciones totalmente vacías. Depende de T011.
- [X] T014 [US1] Implementar `backend/src/players/adapters/whoscored/whoscored.types.ts` con tipos privados del transporte, candidatos, payload estructurado, métricas normalizadas y estados del adapter, alineados con `WhoScoredLookupPort`.
- [X] T015 [US1] Implementar en `backend/src/players/adapters/whoscored/whoscored.adapter.ts` el transporte validado en T007, los requests de búsqueda/perfil, el timeout individual, el contexto de cancelación, el parsing del payload y la normalización de las siete métricas. Depende de T007, T010, T012 y T014.
- [X] T016 [US1] Implementar `backend/src/players/estadisticas-jugador.service.ts` para crear el deadline de 30 segundos, verificar `idJugador`, invocar `WhoScoredAdapter` mediante `WhoScoredLookupPort`, construir `EstadisticasJugador`, persistir mediante `EstadisticasJugadorWriterPort` y devolver éxito completo o parcial. Depende de T004, T006, T008, T009, T013 y T015.
- [X] T017 [P] [US1] Escribir `backend/test/unit/players/estadisticas-jugador-zero.spec.ts` para comprobar que un cero externo se persiste como `0`, que un campo ausente se conserva como `null` y que una observación con al menos una métrica válida puede ser parcial. Depende de T016.
- [X] T018 [US1] Crear `backend/test/unit/players/estadisticas-jugador-sc005.spec.ts` como test de aceptación con al menos 20 `idJugador` distintos y 20 casos/fixtures controlados. Para cada jugador debe verificar `idJugador`, matching correcto, goles, asistencias, tiros, pases clave, regates, entradas, `ratingWhoScored` cuando esté disponible y que sus estadísticas nunca se asocien a otro jugador. Debe usar fakes/mock de Jugador y no depender de catálogo real ni Football-Data. Depende de T016 y T017.

**Checkpoint**: US1 funciona offline con contratos y fakes, cubre 20 jugadores distintos y no requiere endpoints ni una implementación física del catálogo.

---

## Phase 4: User Story 2 - Evitar asociaciones incorrectas durante la identificación (Priority: P1)

**Goal**: Rechazar candidatos no encontrados, discrepantes o ambiguos cuando nombre, equipo, liga y temporada no produzcan una única identidad consistente.

**Independent Test**: Ejecutar fixtures con cero candidatos, varios candidatos, equipo incorrecto, liga incorrecta o varias temporadas igualmente válidas; verificar el resultado clasificado y que el writer no recibe ninguna estadística.

### Tests for User Story 2

- [X] T019 [P] [US2] Escribir `backend/test/unit/players/whoscored-matching.spec.ts` y `backend/test/unit/players/estadisticas-jugador.service-identity.spec.ts` para la selección determinística por liga/torneo, equipo, temporada actual y jugador, incluyendo coincidencia única, nombre repetido, discrepancias, ningún candidato y múltiples registros igualmente válidos; verificar que los casos inseguros no invoquen el writer. Depende de T006, T008 y T016.

### Implementation for User Story 2

- [X] T020 [US2] Completar en `backend/src/players/adapters/whoscored/whoscored.adapter.ts` y `backend/src/players/estadisticas-jugador.service.ts` el matching conjunto por liga, equipo, temporada y jugador, la selección única del registro y los estados `jugador_no_encontrado`/`matching_ambiguo`; no usar fallback por nombre, combinación de registros ni persistencia ante identidad insegura. Depende de T015 y T019.

**Checkpoint**: US1 continúa pasando y US2 impide toda asociación insegura sin requerir una implementación física del catálogo.

---

## Phase 5: User Story 3 - Informar fallas y conservar la integridad local (Priority: P1)

**Goal**: Clasificar indisponibilidad, deadline excedido, estructura inesperada, estadísticas faltantes y errores de escritura sin inventar datos ni dejar efectos locales incorrectos.

**Independent Test**: Simular timeout, deadline excedido, fuente no disponible, estructura inesperada, estadísticas parciales persistibles, ausencia total y error de escritura; verificar cada resultado y la ausencia de modificaciones a `Jugador`.

### Tests for User Story 3

- [X] T021 [P] [US3] Escribir `backend/test/unit/players/whoscored-adapter-failures.spec.ts` para timeout individual, error de red, HTTP no disponible, estructura inesperada, campos omitidos, valores no interpretables y ausencia total de estadísticas usando fake del transporte. Depende de T015.
- [X] T022 [P] [US3] Escribir `backend/test/unit/players/estadisticas-jugador.service-partial.spec.ts` para **estadísticas parciales persistibles**: jugador identificado, al menos una métrica válida, campos faltantes como `null` y exactamente una observación atómica escrita por el writer fake. Depende de T008 y T016.
- [X] T023 [P] [US3] Escribir `backend/test/unit/players/estadisticas-jugador.service-deadline.spec.ts` con fake timers o una abstracción de tiempo controlada para bloquear/demorar la dependencia externa más allá de 30 segundos simulados; verificar que la operación finaliza, devuelve `fuente_no_disponible`, no invoca el writer y no deja una promesa pendiente indefinidamente. Depende de T007 y T016.
- [X] T024 [P] [US3] Escribir `backend/test/unit/players/estadisticas-jugador.service-persistence-error.spec.ts` para **error de persistencia**: el writer falla durante la escritura y no queda ninguna fila parcial, incompleta u huérfana; verificar `error_persistencia` y que el jugador local no se modifica. Depende de T006 y T016.

### Implementation for User Story 3

- [X] T025 [US3] Completar en `backend/src/players/adapters/whoscored/whoscored.adapter.ts` la clasificación de timeout, indisponibilidad, respuesta no interpretable y estadísticas faltantes, preservando `0`, convirtiendo ausencia a `null` y evitando datos crudos fuera del adapter. Depende de T020 y T021.
- [X] T026 [US3] Completar en `backend/src/players/estadisticas-jugador.service.ts` la coordinación entre timeout individual y deadline total, los estados `exito_parcial`, `sin_estadisticas` y `error_persistencia`, y la regla de que una observación parcial de datos se escribe una sola vez de forma atómica. Una falla del writer no puede dejar escritura parcial. Depende de T020, T022, T023, T024 y T025; T020 es una dependencia puntual por compartir el archivo del servicio, no una dependencia general de US3 respecto de US2.

**Checkpoint**: US3 puede comenzar sus tests T021-T024 después de T016, sin esperar a US2; solo T025/T026 esperan T020 por modificación de archivos compartidos. Todas las fallas tienen un resultado observable y no alteran el jugador local.

---

## Phase 6: Integración post-merge con el catálogo

**Purpose**: Implementar únicamente los componentes que requieren entidades, repositorios, providers y migraciones físicas del catálogo real.

- [ ] T027 Conectar `JugadorLookupPort` y `EstadisticasJugadorWriterPort` con el contrato real de `backend/src/players/players.repository.ts`, extendiéndolo mínimamente y sin crear un segundo repositorio. Ejecutar después del merge del catálogo y de T004.
- [ ] T028 Implementar `backend/src/players/persistence/estadisticas-jugador.entity.ts` con `idEstadistica`, `idJugador`, las siete columnas nullable y la relación obligatoria hacia `JugadorEntity`, sin duplicar nombre, equipo ni liga. Ejecutar después del merge del catálogo.
- [ ] T029 Inspeccionar nuevamente `backend/migrations/` después de integrar la migración real de jugadores y crear la migración de `EstadisticasJugador` con el nombre y timestamp numérico concreto inmediatamente posterior, incluyendo foreign key, restricciones e índices. No dejar marcadores de timestamp ni crear una tabla `Jugador` temporal.
- [ ] T030 Extender `backend/src/players/persistence/typeorm-jugador.repository.ts` con la consulta por `idJugador` y la inserción atómica de estadísticas, solo si el archivo real del catálogo está disponible. Depende de T027 y T028.
- [ ] T031 Registrar adapter, servicio y entidad en `backend/src/players/players.module.ts`, únicamente sobre el módulo real del catálogo y sin agregar endpoints ni modificar `players.controller.ts`. Depende de T027, T028 y T030.
- [ ] T032 Crear `backend/test/integration/players/estadisticas-jugador.persistence.spec.ts` contra PostgreSQL/Testcontainers para foreign key, relación `Jugador 1-N EstadisticasJugador`, múltiples observaciones, asociación por `idJugador`, `0`, `NULL` y rechazo de jugador inexistente. Depende de T029-T031.
- [ ] T033 Crear `backend/test/integration/players/estadisticas-jugador.atomicity.spec.ts` para error de escritura, ausencia de filas parciales/huérfanas y confirmación de que `Jugador` no se actualiza ni elimina. Depende de T030-T032.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validar alcance, documentación, compilación, tests y arranque local.

- [X] T034 [P] Actualizar `specs/004-whoscored-player-stats/quickstart.md` solo si los comandos o prerrequisitos finales difieren de la implementación realizada.
- [X] T035 [P] Revisar `backend/src/players/` y `backend/migrations/` para confirmar que no se agregaron Jugador, Equipo, Liga, repositorios alternativos, carpetas arquitectónicas nuevas ni cambios a Football-Data.
- [X] T036 Ejecutar desde `backend` `npm run build`, `npm run lint` y `npm run test:unit`; ejecutar `npm run test:integration` únicamente después de completar T027-T033. Registrar fallos sin modificar tests existentes.
- [ ] T037 Ejecutar desde `backend` `npm run start` después de T036, esperar solo la señal necesaria para confirmar que la aplicación levanta sin error, fallar si el proceso termina o arranca con error y finalizarlo controladamente después del smoke test. No modificar scripts ni agregar mecanismos de despliegue.
- [ ] T038 Ejecutar el smoke test opcional documentado en `specs/004-whoscored-player-stats/quickstart.md` fuera de CI y registrar si WhoScored está disponible o devuelve un estado clasificado.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no depende de código nuevo.
- **Foundational (Phase 2)**: T004 depende de la inspección de T002; T006 y T008 dependen de T004; T007 depende de T005; T009 usa los fakes de T006/T008 y queda en US1; T010 depende de T005. La validación de transporte T007 es prerequisito de T015.
- **User Story 1 (Phase 3)**: la cadena crítica es T004 → T006/T008 → T009 → T016. El adapter T015 depende explícitamente de la validación T007 antes de su implementación concreta.
- **User Story 2 (Phase 4)**: T019 prepara tests; T020 implementa matching y protección de identidad en adapter/servicio.
- **User Story 3 (Phase 5)**: T021-T024 requieren solo T015/T016 y pueden comenzar después de T016, sin depender de que US2 haya terminado. T025/T026 dependen puntualmente de T020 porque modifican archivos compartidos, no porque US3 dependa funcionalmente de US2.
- **Integración post-merge (Phase 6)**: T027-T033 dependen de la disponibilidad física del catálogo y de la secuencia real de migraciones; no bloquean el trabajo actual.
- **Polish (Phase 7)**: T037 ocurre después de T036; el startup smoke test es posterior a build, lint y tests.

### Required dependency chains

```text
T004 -> T006 -> T009 -> T016
T005 -> T007 -> T015 -> T016
T016 -> T023
T036 -> T037
```

T004 define los contratos, T006 implementa el fake de Jugador y T009 usa ese fake junto con el fake de WhoScored de T008. T023 verifica el deadline total con un reloj/transporte controlado. T037 es el startup smoke test posterior a T036.

### User Story Dependencies

- **US1 (P1)**: es el MVP y puede implementarse en la rama actual con contratos, fixtures y fakes; no requiere la entidad física de `Jugador`.
- **US2 (P1)**: depende de los componentes base de US1 porque protege el matching y evita escrituras incorrectas.
- **US3 (P1)**: sus tests T021-T024 dependen de US1 hasta T016, no de US2; únicamente T025/T026 dependen puntualmente de T020 por compartir `whoscored.adapter.ts` y `estadisticas-jugador.service.ts`.

### Valid `[P]` opportunities

- T002 y T003 pueden ejecutarse en paralelo después de T001 porque inspeccionan archivos distintos.
- T005 puede ejecutarse en paralelo con T002/T003 después de T001 porque produce `research.md` y no consume código del catálogo.
- T006 y T008 pueden ejecutarse en paralelo después de T004; implementan dobles distintos.
- T010 puede ejecutarse en paralelo con T006/T008 una vez completado T005; T009 espera T006/T008.
- T011 puede ejecutarse en paralelo con T009/T010; T012 puede ejecutarse cuando T010 termine y en paralelo con T011.
- T017 puede ejecutarse en paralelo con otros tests posteriores a T016 porque usa un archivo separado.
- T019 puede ejecutarse después de T016; T021, T022, T023 y T024 pueden comenzar después de T016 en paralelo con la implementación de US2, porque escriben archivos de test distintos.
- T025 y T026 permanecen seriales respecto de T020 y entre sí por modificar el adapter/servicio compartidos.
- T034 y T035 pueden ejecutarse en paralelo; T036 y T037 permanecen seriales por sus dependencias de validación.

Las tareas no listadas como paralelas se mantienen seriales por dependencia de artefactos o porque modifican el mismo archivo.

## Parallel Example: User Story 1

```text
Después de T004-T008:

Task T009: caso de uso con fake de Jugador y fake de WhoScored en backend/test/unit/players/estadisticas-jugador.service.spec.ts
Task T010: fixtures controlados en backend/test/unit/players/fixtures/whoscored/
Task T011: invariantes de dominio en backend/test/unit/players/estadisticas-jugador.spec.ts
```

T009 no comienza hasta que T006 y T008 hayan terminado. T015 no comienza hasta que T007 haya validado el transporte.

## Implementation Strategy

### MVP First (User Story 1 only)

1. Completar T001-T008.
2. Completar US1 T009-T018 con fakes y fixtures.
3. Detenerse en el checkpoint de US1 y ejecutar T036 para build, lint y tests unitarios.
4. Ejecutar T037 como validación final de arranque local.
5. Integrar T027-T033 solo cuando la rama del catálogo esté disponible.

### Incremental Delivery

1. Agregar US2 T019-T020 para bloquear asociaciones incorrectas.
2. Agregar US3 T021-T026 para fallas, deadline, ausencia total, datos parciales y error de escritura.
3. Ejecutar la integración post-merge T027-T033.
4. Ejecutar T034-T038 y verificar que el diff permanece limitado a estadísticas, WhoScored e integración mínima.

### Catalog integration boundary

No se bloquean T005-T026 por la ausencia de `Jugador`, `JugadorEntity`, `players.repository.ts` o sus migraciones. Únicamente T027-T033 requieren el merge del catálogo y la tabla real.

## Completion Report

- **Total de tareas**: 38.
- **US1**: T009-T018, 10 tareas.
- **US2**: T019-T020, 2 tareas.
- **US3**: T021-T026, 6 tareas.
- **Setup + Foundational**: T001-T008, 8 tareas.
- **Integración post-merge**: T027-T033, 7 tareas.
- **Polish**: T034-T038, 5 tareas.
- **MVP sugerido**: Phase 1 + Phase 2 + User Story 1, incluyendo T037.
- **SC-005**: T018, con al menos 20 `idJugador` distintos, 20 fixtures/casos y verificación de todos los campos y asociaciones.
- **Startup**: T037, posterior a T036.
- **Formato**: todas las tareas usan checkbox, ID secuencial, etiquetas `[P]`/`[USn]` únicamente donde corresponden y una ruta concreta.
