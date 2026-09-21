---
description: "Tareas de implementación del catálogo de jugadores"
---

# Tasks: Catálogo de jugadores

**Input**: Documentos de diseño de `/specs/004-catalogo-jugadores/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/openapi.yaml` y `quickstart.md`.

**Scope**: Esta lista implementa modelo, persistencia, catálogo local y documentación.
No incluye scraping, parser HTML, cliente WhoScored ni `WhoscoredJugadoresAdapter`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar la estructura aislada de la feature sin modificar tests existentes.

- [X] T001 Crear los directorios de feature en `backend/src/players/domain/`, `backend/src/players/dto/`, `backend/src/players/persistence/`, `backend/test/unit/players/` y `backend/test/integration/players/`.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Crear el dominio, el puerto de persistencia, el esquema local y la
infraestructura NestJS que necesitan todas las historias.

**Checkpoint**: El dominio y la persistencia base pueden compilarse y probarse sin
exponer todavía endpoints públicos.

- [X] T002 Definir `JugadorRepository`, `FiltrosJugadores` y sus tokens de inyección en `backend/src/players/players.repository.ts`, incluyendo las operaciones de consulta que necesitarán listado, detalle y futuras identidades externas.
- [X] T003 [P] Escribir primero los tests unitarios de `Liga`, `Equipo` y `Jugador` en `backend/test/unit/players/domain/liga.spec.ts`, `backend/test/unit/players/domain/equipo.spec.ts` y `backend/test/unit/players/domain/jugador.spec.ts`, cubriendo normalización, campos obligatorios, UUID estable y consistencia equipo-liga.
- [X] T004 Implementar `Liga`, `Equipo` y `Jugador` como modelos ricos en `backend/src/players/domain/liga.ts`, `backend/src/players/domain/equipo.ts` y `backend/src/players/domain/jugador.ts`, manteniendo el dominio independiente de NestJS, TypeORM, HTTP y PostgreSQL.
- [X] T005 [P] Crear las entidades TypeORM base `LigaEntity`, `EquipoEntity` y `JugadorEntity` en `backend/src/players/persistence/liga.entity.ts`, `backend/src/players/persistence/equipo.entity.ts` y `backend/src/players/persistence/jugador.entity.ts`, con UUIDs, relaciones, columnas, índices y restricciones de tamaño.
- [X] T006 Crear `backend/migrations/1720000000000-CreateCatalogoJugadores.ts` con las tablas `ligas`, `equipos` y `jugadores`, claves foráneas, unicidad e índices, y cargar un seed determinista con al menos una liga, equipo y jugador activo por cada una de las cinco ligas.
- [X] T007 Actualizar `backend/src/database/data-source.ts`, `backend/test/integration/helpers/integration-app.ts` y `backend/test/integration/support/postgres.ts` para registrar las nuevas entidades y migraciones, limpiar las tablas del catálogo durante los tests y conservar las migraciones de usuarios.
- [X] T008 Implementar el acceso TypeORM de consultas base en `backend/src/players/persistence/typeorm-jugador.repository.ts`, mapeando entidades a modelos de dominio y soportando filtros por liga, equipo, posición, estado activo, orden por nombre/id y búsqueda por UUID.
- [X] T009 Crear `JugadoresModule` en `backend/src/players/players.module.ts`, registrar el proveedor `TypeOrmJugadorRepository` bajo el token del repository y agregar el módulo a `backend/src/app.module.ts` sin cambiar el mecanismo JWT existente.

## Phase 3: User Story 1 - Consultar el catálogo de jugadores (Priority: P1) 🎯 MVP

**Goal**: Exponer `GET /players` con datos locales, filtros combinables, orden
determinista y respuesta `items` + `total`.

**Independent Test**: Con la migración aplicada, consultar el listado sin filtros,
cada filtro por separado y filtros combinados; verificar HTTP 200, resultados activos,
orden y colección vacía cuando no hay coincidencias.

### Tests for User Story 1

- [X] T010 [P] Escribir tests unitarios de `CatalogoJugadoresService.listar` en `backend/test/unit/players/catalogo-jugadores.service.spec.ts`, verificando filtros AND, normalización, exclusión de inactivos, orden nombre/id y total.
- [X] T011 [P] Escribir tests de integración del listado en `backend/test/integration/players/listar-jugadores.spec.ts` con PostgreSQL/Testcontainers y Supertest, cubriendo 200 sin filtros, cada filtro, filtros combinados, cero coincidencias y filtros inválidos.

### Implementation for User Story 1

- [X] T012 Implementar `ListarJugadoresDto` en `backend/src/players/dto/listar-jugadores.dto.ts` con `liga`, `equipo` y `posicion` opcionales, trimming, longitud máxima de 100 caracteres y mensajes de validación en español.
- [X] T013 Implementar `CatalogoJugadoresService.listar` en `backend/src/players/catalogo-jugadores.service.ts`, delegando la consulta al repository y construyendo la respuesta pública sin `proveedor` ni `externalId`.
- [X] T014 Implementar `JugadorResponseDto` y `ListaJugadoresResponseDto` en `backend/src/players/dto/jugador-response.dto.ts` y `backend/src/players/dto/lista-jugadores-response.dto.ts`, incluyendo UUIDs, equipo, liga, estado y fecha ISO 8601.
- [X] T015 Implementar `GET /players` en `backend/src/players/players.controller.ts`, aplicar un `ValidationPipe` específico con HTTP 400 para filtros inválidos, agregar decoradores Swagger y conectar el DTO con `CatalogoJugadoresService`.

**Checkpoint**: `GET /players` funciona con datos locales y cumple el contrato del
listado sin realizar llamadas a ningún proveedor externo.

## Phase 4: User Story 2 - Consultar el detalle de un jugador (Priority: P1)

**Goal**: Exponer `GET /players/:id` para consultar el detalle de un jugador activo.

**Independent Test**: Usar un UUID existente, uno inexistente, uno asociado a un
jugador inactivo y un parámetro con formato inválido; verificar 200, 404 y 400 según
corresponda.

### Tests for User Story 2

- [X] T016 [P] Escribir tests unitarios de `CatalogoJugadoresService.obtenerPorId` en `backend/test/unit/players/obtener-jugador.service.spec.ts`, cubriendo jugador activo, UUID inexistente, jugador inactivo y error de parámetro inválido.
- [X] T017 [P] Escribir tests de integración del detalle en `backend/test/integration/players/obtener-jugador.spec.ts` con Supertest, verificando contrato de respuesta, 400 y 404.

### Implementation for User Story 2

- [X] T018 Agregar `obtenerPorId` a `backend/src/players/catalogo-jugadores.service.ts` y la ruta `GET /players/:id` a `backend/src/players/players.controller.ts`, validando UUID, filtrando inactivos y traduciendo ausencia a HTTP 404 con mensaje en español.

**Checkpoint**: El listado y el detalle funcionan juntos sin exponer información de
persistencia interna ni identidades externas.

## Phase 5: User Story 3 - Mantener un modelo consistente para futuras importaciones (Priority: P1)

**Goal**: Garantizar identidad externa idempotente y relaciones consistentes sin
implementar todavía el Adapter ni el scraping.

**Independent Test**: Intentar persistir dos identidades con el mismo proveedor y
`externalId`, y un jugador cuyo equipo pertenezca a otra liga; ambos casos deben ser
rechazados sin crear registros parciales.

### Tests for User Story 3

- [X] T019 [P] Escribir tests unitarios de identidad externa en `backend/test/unit/players/domain/identidad-externa.spec.ts`, cubriendo proveedor/externalId obligatorios, trimming, identidad única lógica y asociación a jugador.
- [X] T020 [P] Escribir tests de integración de consistencia en `backend/test/integration/players/consistencia-jugadores.spec.ts`, cubriendo unicidad `(proveedor, externalId)`, relación equipo-liga, rollback/no persistencia parcial y continuidad de lecturas locales sin proveedor.

### Implementation for User Story 3

- [X] T021 Implementar `IdentidadExternaJugador` y los métodos de asociación/idempotencia en `backend/src/players/domain/identidad-externa-jugador.ts` y `backend/src/players/domain/jugador.ts`, sin agregar un endpoint público de importación.
- [X] T022 Crear `IdentidadExternaJugadorEntity` en `backend/src/players/persistence/identidad-externa-jugador.entity.ts` y la migración `backend/migrations/1720000001000-CreateIdentidadesExternasJugador.ts` con foreign key a jugadores y restricción única `(proveedor, external_id)`.
- [X] T023 Extender `backend/src/players/players.repository.ts` y `backend/src/players/persistence/typeorm-jugador.repository.ts` con búsqueda/guardado interno por identidad externa, manteniendo el contrato preparado para una futura feature de importación sin crear `FuenteJugadoresAdapter` en esta entrega.
- [X] T024 Actualizar `backend/src/database/data-source.ts`, `backend/test/integration/helpers/integration-app.ts` y `backend/test/integration/support/postgres.ts` para incluir la entidad y migración de identidades externas, sin alterar los tests existentes de usuarios y autenticación.

**Checkpoint**: El modelo local puede recibir en el futuro registros canónicos con
`proveedor` y `externalId` sin duplicar jugadores, pero todavía no realiza scraping.

## Phase 6: User Story 4 - Consultar el contrato del catálogo (Priority: P2)

**Goal**: Hacer verificable la feature mediante Swagger/OpenAPI y Postman.

**Independent Test**: Abrir Swagger, revisar los dos endpoints y ejecutar la colección
Postman contra el backend con el seed local.

### Implementation for User Story 4

- [X] T025 [P] Completar la documentación Swagger en `backend/src/players/players.controller.ts`, `backend/src/players/dto/listar-jugadores.dto.ts`, `backend/src/players/dto/jugador-response.dto.ts` y `backend/src/players/dto/lista-jugadores-response.dto.ts`, incluyendo 200, 400, 404, filtros, ejemplos y ausencia de `externalId`.
- [X] T026 [P] Crear `docs/postman/players.postman_collection.json` con requests para listado sin filtros, listado por liga/equipo/posición, filtros combinados, detalle y ejemplos de errores.
- [X] T027 Actualizar `backend/README.md` con la ruta `/players`, el seed local, comandos de migración/tests y referencia a Swagger y Postman, sin documentar scraping como parte de esta feature.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validar el entregable completo y registrar evidencia sin modificar tests
existentes.

- [ ] T028 [P] Comparar `specs/004-catalogo-jugadores/contracts/openapi.yaml` con los decoradores reales de `backend/src/players/` y corregir diferencias de contrato sin ampliar el alcance.
- [ ] T029 Ejecutar desde `backend/` `npm run test:unit`, `npm run test:integration`, `npm run build` y `npm run lint`; corregir solo fallos introducidos por la feature.
- [ ] T030 Ejecutar los escenarios de `specs/004-catalogo-jugadores/quickstart.md` contra PostgreSQL local/Testcontainers y registrar comandos, resultados y respuestas HTTP en `specs/004-catalogo-jugadores/validation.md`.
- [X] T031 Revisar `git diff` para confirmar que no se modificaron ni eliminaron tests existentes, y dejar documentados los límites: sin scraping, sin llamadas WhoScored, sin Football-Data.org, sin cotizaciones y sin portfolio.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no depende de otras fases.
- **Foundational (Phase 2)**: depende de Setup y bloquea las historias.
- **User Story 1 (Phase 3)**: depende de la persistencia y el dominio base.
- **User Story 2 (Phase 4)**: depende de US1 porque reutiliza service, controller y DTOs.
- **User Story 3 (Phase 5)**: depende del dominio y repository base; sus cambios de
  persistencia deben integrarse antes de la validación final.
- **User Story 4 (Phase 6)**: depende de los endpoints de US1 y US2.
- **Polish (Phase 7)**: depende de todas las historias seleccionadas.

### User Story Dependencies

- **US1 (P1)**: después de Phase 2; constituye el MVP del catálogo.
- **US2 (P1)**: después de US1; reutiliza `CatalogoJugadoresService` y los DTOs.
- **US3 (P1)**: después de Phase 2; puede desarrollarse en paralelo con US1 si no se
  editan simultáneamente los mismos archivos de repository/persistencia.
- **US4 (P2)**: después de US1 y US2.

### Parallel Opportunities

- T003 y T005 pueden ejecutarse en paralelo porque afectan tests de dominio y entidades
  TypeORM distintas.
- T010 y T011 pueden ejecutarse en paralelo porque afectan tests unitarios e integración
  distintos.
- T016 y T017 pueden ejecutarse en paralelo porque afectan tests distintos del detalle.
- T019 y T020 pueden ejecutarse en paralelo porque afectan tests unitarios e integración
  distintos.
- T025 y T026 pueden ejecutarse en paralelo porque afectan documentación Swagger y
  colección Postman distintas.
- Las tareas de US1, US2 y US3 no deben ejecutarse en paralelo si modifican el mismo
  `catalogo-jugadores.service.ts`, `players.controller.ts` o `typeorm-jugador.repository.ts`.

## Implementation Strategy

### MVP First

1. Completar Phase 1 y Phase 2.
2. Completar US1.
3. Ejecutar sus tests y verificar `GET /players` con el seed de las cinco ligas.
4. Detenerse para validar el MVP antes de continuar con detalle, identidad externa y
   documentación completa.

### Incremental Delivery

1. US1 agrega el catálogo listado y filtrado.
2. US2 agrega el detalle por UUID.
3. US3 asegura el modelo para la futura importación.
4. US4 agrega Swagger, OpenAPI y Postman.
5. Polish valida build, tests, lint y quickstart.

## Out of Scope

- `WhoscoredJugadoresAdapter` o cualquier Adapter concreto.
- Cliente HTTP, navegador automatizado, parser HTML o selectores de WhoScored.
- Retries, rate limiting y manejo específico del scraper.
- Integración con Football-Data.org.
- Estadísticas detalladas, cotizaciones, tokens, portfolio y frontend.
