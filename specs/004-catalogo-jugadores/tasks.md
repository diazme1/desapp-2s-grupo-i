# Tasks: Catálogo base de jugadores

**Input**: Design documents from `/specs/004-catalogo-jugadores/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml) y
[quickstart.md](quickstart.md).

**Organization**: Las tareas están agrupadas por historia de usuario para permitir validar
cada entrega de forma independiente. El código de esta feature ya fue implementado; esta
lista documenta la secuencia SDD y sirve como trazabilidad para una revisión o reimplementación.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar la base existente y la configuración necesaria sin alterar tests previos.

- [ ] T001 Revisar `backend/package.json`, `backend/tsconfig.json` y `backend/jest.config.cjs` para confirmar versiones, compilación estricta y comandos de verificación.
- [ ] T002 [P] Configurar `FOOTBALL_DATA_API_URL`, `FOOTBALL_DATA_API_TOKEN` y `FOOTBALL_DATA_COMPETITIONS` en `backend/.env.example`, `backend/src/config/environment.ts` y `docker-compose.yml`.
- [ ] T003 [P] Crear la estructura `backend/src/players/`, `backend/test/unit/players/` y `backend/test/integration/players/`, incluyendo la carpeta reservada `backend/src/players/adapters/whoscored/` sin implementar estadísticas.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Construir los límites de dominio, persistencia y composición que necesitan las tres historias.

- [ ] T004 [P] Implementar `Liga`, `Equipo` y `Jugador` en `backend/src/players/domain/` con UUID interno, validaciones e invariantes de datos base.
- [ ] T005 [P] Crear `LigaEntity`, `EquipoEntity` y `JugadorEntity` en `backend/src/players/persistence/` y la migración `backend/migrations/1727000000000-CreateCatalogoJugadores.ts`.
- [ ] T006 Definir `CatalogoBase`, `PlayersRepository`, `JugadorConRelaciones` y el resumen de actualización en `backend/src/players/players.repository.ts`.
- [ ] T007 Implementar el repository transaccional y el upsert por identificador externo en `backend/src/players/persistence/typeorm-players.repository.ts`, conservando UUIDs internos y relaciones.
- [ ] T008 Registrar entidades, migraciones y el datasource del catálogo en `backend/src/database/data-source.ts` y componer `PlayersModule` con `AuthModule` en `backend/src/players/players.module.ts`.
- [ ] T009 [P] Completar `backend/src/common/filters/http-exception.filter.ts` y `backend/src/configure-app.ts` para errores de proveedor y documentación general de Swagger.

**Checkpoint**: La base de dominio y persistencia está lista; las historias pueden implementarse y probarse por separado.

## Phase 3: User Story 1 - Actualizar el catálogo base (Priority: P1) 🎯 MVP

**Goal**: Obtener la fuente externa, traducirla y actualizar ligas, equipos y jugadores en una única operación.

**Independent Test**: Mockear Football-Data.org, ejecutar `POST /catalog/refresh` con JWT y verificar el resumen, la persistencia y la repetición sin duplicados.

### Tests for User Story 1

- [ ] T010 [P] [US1] Cubrir validaciones de dominio y fechas en `backend/test/unit/players/domain.spec.ts`.
- [ ] T011 [P] [US1] Cubrir traducción, header `X-Auth-Token`, respuestas inválidas y fallas HTTP en `backend/test/unit/players/football-data.adapter.spec.ts`.
- [ ] T012 [US1] Cubrir coordinación, error de proveedor y ausencia de persistencia parcial en `backend/test/unit/players/services.spec.ts`.
- [ ] T013 [US1] Cubrir refresh autenticado, upsert estable y rollback/continuidad local en `backend/test/integration/players/catalog.spec.ts` usando PostgreSQL real.

### Implementation for User Story 1

- [ ] T014 [US1] Implementar los tipos externos y `FootballDataAdapter` en `backend/src/players/adapters/football-data/football-data.types.ts` y `backend/src/players/adapters/football-data/football-data.adapter.ts` usando competencias y plantillas v4.
- [ ] T015 [US1] Implementar `ActualizarCatalogoService` en `backend/src/players/actualizar-catalogo.service.ts` para completar la carga externa antes de delegar la transacción.
- [ ] T016 [US1] Exponer `POST /catalog/refresh` protegido por Bearer JWT desde `backend/src/players/players.controller.ts` y documentarlo con `RefreshCatalogoResponseDto` en `backend/src/players/dto/refresh-catalogo-response.dto.ts`.
- [ ] T017 [US1] Registrar tokens de adapter/repository y providers en `backend/src/players/players.module.ts` y agregar `PlayersModule` a `backend/src/app.module.ts`.

**Checkpoint**: La actualización base funciona sin WhoScored ni estadísticas, es repetible y no deja persistencia parcial.

## Phase 4: User Story 2 - Consultar el catálogo (Priority: P1)

**Goal**: Listar jugadores desde PostgreSQL sin consultar proveedores externos, con filtro opcional por liga.

**Independent Test**: Sembrar registros locales, desconectar/mockear el proveedor y verificar `GET /players` y lista vacía.

### Tests for User Story 2

- [ ] T018 [P] [US2] Agregar casos de lista vacía, listado local, filtro `ligaCodigo` y proveedor caído en `backend/test/integration/players/catalog.spec.ts`.

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implementar `ListarJugadoresDto` en `backend/src/players/dto/listar-jugadores.dto.ts` con trimming, mayúsculas y límites de entrada.
- [ ] T020 [US2] Implementar `CatalogoJugadoresService.listar` y la consulta con relaciones en `backend/src/players/catalogo-jugadores.service.ts` y `backend/src/players/persistence/typeorm-players.repository.ts`.
- [ ] T021 [US2] Implementar `LigaResponseDto`, `EquipoResponseDto` y `JugadorResponseDto` en `backend/src/players/dto/jugador-response.dto.ts`, excluyendo identificadores del proveedor de la respuesta pública.
- [ ] T022 [US2] Exponer `GET /players` desde `backend/src/players/players.controller.ts` y documentar su respuesta de lista en `specs/004-catalogo-jugadores/contracts/openapi.yaml`.

**Checkpoint**: El catálogo local se puede consultar sin disponibilidad de Football-Data.org.

## Phase 5: User Story 3 - Consultar el detalle de un jugador (Priority: P2)

**Goal**: Resolver un jugador por UUID interno y devolver sus datos base, equipo y liga.

**Independent Test**: Consultar un UUID sembrado, uno inexistente y uno inválido, verificando 200, 404 y 422.

### Tests for User Story 3

- [ ] T023 [US3] Cubrir detalle exitoso, UUID inexistente y UUID inválido en `backend/test/integration/players/catalog.spec.ts`.

### Implementation for User Story 3

- [ ] T024 [US3] Implementar `CatalogoJugadoresService.buscarPorId` con `NotFoundException` en `backend/src/players/catalogo-jugadores.service.ts`.
- [ ] T025 [US3] Exponer `GET /players/:id` con `ParseUUIDPipe` desde `backend/src/players/players.controller.ts` y mapear la salida al DTO público.
- [ ] T026 [US3] Completar los contratos 404/422 y el esquema de detalle en `specs/004-catalogo-jugadores/contracts/openapi.yaml`.

**Checkpoint**: Listado y detalle son lecturas locales independientes del proveedor.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cerrar documentación, contratos y evidencia de verificación del incremento.

- [ ] T027 [P] Actualizar `README.md`, `backend/README.md`, `backend/.env.example` y `docs/postman/players-catalog.postman_collection.json` con setup, JWT, refresh y consultas locales.
- [ ] T028 [P] Completar y revisar `specs/004-catalogo-jugadores/research.md`, `data-model.md`, `quickstart.md` y `contracts/openapi.yaml` contra la implementación.
- [ ] T029 Ejecutar `npm.cmd run build`, `npm.cmd run lint` y `npm.cmd run test:unit` desde `backend/` y registrar resultados en `specs/004-catalogo-jugadores/validation.md`.
- [ ] T030 Ejecutar `npm.cmd run test:integration` con Docker/Testcontainers disponible y validar migración, persistencia, Swagger y Postman según `specs/004-catalogo-jugadores/quickstart.md`.
- [ ] T031 Verificar que no existan implementaciones de WhoScored, estadísticas, compras, valuaciones o portfolio en `backend/src/players/` y que los tests existentes no hayan sido modificados.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2; constituye el MVP de carga del catálogo.
- **User Story 2 (Phase 4)**: Depends on Phase 2; puede probarse con datos sembrados sin US1.
- **User Story 3 (Phase 5)**: Depends on Phase 2; puede probarse con un jugador sembrado sin US1/US2.
- **Polish (Phase 6)**: Depends on las historias que se quieran entregar y sus verificaciones.

### User Story Dependencies

- **US1**: No depende de otras historias después de Foundation.
- **US2**: No depende de US1 para la prueba independiente; el refresh es una fuente natural de datos compartida.
- **US3**: No depende de US1/US2 para la prueba independiente; consume el mismo repository y contrato de detalle.

### Parallel Opportunities

- T002, T003, T004, T005 y T009 pueden ejecutarse en paralelo cuando no compartan archivos.
- T010 y T011 pueden ejecutarse en paralelo; T012 depende del contrato del adapter y repository.
- T019 y T021 pueden ejecutarse en paralelo; T020 y T022 dependen de sus contratos.
- T027 y T028 pueden ejecutarse en paralelo después de fijar el contrato final.

## Implementation Strategy

### MVP First

1. Completar Setup y Foundation.
2. Completar US1, incluida persistencia transaccional y refresh autenticado.
3. Validar con el adapter mockeado y PostgreSQL real.

### Incremental Delivery

1. Agregar US2 para consultas locales y continuidad ante caída del proveedor.
2. Agregar US3 para detalle y errores de identificación.
3. Cerrar contratos, Postman, quickstart y evidencia.

## Notes

- `[P]` indica tareas paralelizables en archivos distintos.
- Las tareas de tests son obligatorias porque la spec y la constitución exigen casos felices y borde.
- La segunda spec podrá agregar estadísticas y WhoScored sobre `backend/src/players/` sin alterar el contrato de esta entrega.
