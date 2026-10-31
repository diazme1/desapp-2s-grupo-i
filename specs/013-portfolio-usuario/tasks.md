# Tasks: Portfolio de usuario

**Input**: Design documents from `/specs/013-portfolio-usuario/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/portfolio.md`, `quickstart.md`

**Scope**: Un único endpoint de lectura. No se agregan tablas, migraciones, escrituras, caché ni
objetivos de rendimiento.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar la estructura mínima de la feature sin cambiar la infraestructura existente.

- [X] T001 [P] Crear la estructura del módulo en `backend/src/portfolio/` con `portfolio.module.ts`, `portfolio.controller.ts`, `portfolio.service.ts`, `portfolio.repository.ts`, `domain/`, `dto/` y `persistence/`.
- [X] T002 [P] Crear los directorios de pruebas nuevas `backend/test/unit/portfolio/`, `backend/test/integration/portfolio/` y el archivo base `backend/test/unit/documentation/portfolio-openapi.spec.ts`, sin modificar suites existentes.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Conectar la feature con la autenticación y el datasource existentes; no crear persistencia.

- [X] T003 Registrar `PortfolioModule` en `backend/src/app.module.ts` e importar únicamente `AuthModule` y `PlayersModule`.
- [X] T004 Configurar el provider `PORTFOLIO_REPOSITORY` en `backend/src/portfolio/portfolio.module.ts` usando `PLAYERS_DATA_SOURCE`, sin crear otro datasource ni entidades TypeORM nuevas.
- [X] T005 Definir el puerto y el read model de consulta en `backend/src/portfolio/portfolio.repository.ts`, limitado a lecturas de usuario, estrategia activa, tenencias, tokens, cotizaciones vigentes y compras.

**Checkpoint**: El módulo puede resolver autenticación y datasource; ninguna tarea de esta fase
debe ejecutar `INSERT`, `UPDATE`, `DELETE`, `save` ni migraciones.

## Phase 3: User Story 1 - Consultar el portfolio valorizado (Priority: P1) 🎯 MVP

**Goal**: Devolver el portfolio propio con posiciones ordenadas y cálculos exactos.

**Independent Test**: Con datos consistentes de tenencias, tokens, compras y cotización activa,
`GET /users/{id}/portfolio` devuelve `200` con el contrato de `contracts/portfolio.md`.

### Tests for User Story 1

- [X] T006 [P] [US1] Crear tests unitarios en `backend/test/unit/portfolio/portfolio.spec.ts` para portfolio vacío, promedio ponderado, ventas ignoradas, cotización vigente, valor actual, ganancias positiva/cero/negativa y ausencia de compras.
- [X] T007 [P] [US1] Crear el test OpenAPI en `backend/test/unit/documentation/portfolio-openapi.spec.ts` para método/ruta, Bearer, parámetro UUID, schemas y respuestas `200`, `401`, `403`, `404`, `409` y `422`.

### Implementation for User Story 1

- [X] T008 [P] [US1] Implementar `Portfolio` y la valorización en `backend/src/portfolio/domain/portfolio.ts` validando tokens/tenencias y aplicando exactamente `promedio = sum(cantidadCompra × cotizacionCompra) / sum(cantidadCompra)`, sin incluir `VENTA`.
- [X] T009 [US1] Completar en `backend/src/portfolio/domain/portfolio.ts` los cálculos exactos `costoDeAdquisicion = cantidadTenencia × precioPromedioCompra`, `valorActual = cantidadTenencia × cotizacionVigente` y `gananciaPerdida = valorActual − costoDeAdquisicion`; no redondear durante las operaciones y serializar half-up a dos posiciones.
- [X] T010 [US1] Implementar `TypeOrmPortfolioRepository` en `backend/src/portfolio/persistence/typeorm-portfolio.repository.ts` con una transacción `REPEATABLE READ`, `SET TRANSACTION READ ONLY` y consultas exclusivamente de lectura.
- [X] T011 [US1] En `backend/src/portfolio/persistence/typeorm-portfolio.repository.ts`, leer en el mismo snapshot el usuario, `recalculo_cotizacion_activo`, tenencias positivas, conteo de tokens individuales, `cotizacion_vigente` alineada con estrategia/`id_recalculo` activos y transacciones `COMPRA`; no consultar `historial_cotizacion`.
- [X] T012 [US1] Crear `PortfolioPositionResponseDto` y `PortfolioResponseDto` en `backend/src/portfolio/dto/portfolio-response.dto.ts`, exponiendo importes como strings de dos decimales, campos nullable y posiciones ordenadas por `idJugador`.
- [X] T013 [US1] Implementar `PortfolioService` en `backend/src/portfolio/portfolio.service.ts` para orquestar el repository, invocar el dominio, traducir errores de datos a `404/409` y devolver el DTO sin lógica HTTP en el dominio.
- [X] T014 [US1] Implementar `GET /users/:id/portfolio` en `backend/src/portfolio/portfolio.controller.ts` con `JwtAuthGuard`, `ParseUUIDPipe` configurado a `422`, decoradores Swagger y delegación exclusiva al Service.

### Integration tests for User Story 1

- [X] T015 [US1] Agregar en `backend/test/integration/portfolio/portfolio.spec.ts` los casos PostgreSQL/Testcontainers de posición valorizada, portfolio vacío, promedio con compras, ventas ignoradas y estrategia activa frente a cotización histórica, reutilizando `createOrdersIntegrationApp` de `backend/test/integration/orders/orders-integration-app.ts` sin modificarlo.

**Checkpoint**: La User Story 1 es demostrable con `200`, posiciones ordenadas y cálculos exactos,
sin cambiar datos persistidos.

## Phase 4: User Story 2 - Proteger privacidad y garantizar solo lectura (Priority: P1)

**Goal**: Permitir únicamente el portfolio propio y rechazar estados inválidos sin respuesta parcial
ni escrituras.

**Independent Test**: Con Supertest, probar JWT, ownership, UUID, usuario inexistente, cotización
faltante e inconsistencia de tokens; comparar snapshots antes y después.

### Tests for User Story 2

- [X] T016 [US2] Completar `backend/test/integration/portfolio/portfolio.spec.ts` con acceso autorizado, ownership antes de consultar, UUID inválido, UUID propio inexistente (`404`), UUID ajeno inexistente (`403`), cotización faltante, tenencia inconsistente, errores `401/403/404/409/422`, ausencia de posiciones parciales y snapshots de no escritura.

### Implementation for User Story 2

- [X] T017 [P] [US2] Completar `backend/src/portfolio/portfolio.service.ts` con `OwnershipService.assertOwner(sub, id)` antes de cualquier lectura; un `id` distinto responde `403` aunque no exista y solo el UUID propio ausente responde `404`.
- [X] T018 [P] [US2] Completar `backend/src/portfolio/domain/portfolio.ts` para rechazar con errores de dominio la tenencia inconsistente o cualquier cotización vigente faltante, sin devolver posiciones parciales ni usar fallback.
- [X] T019 [P] [US2] Revisar `backend/src/portfolio/persistence/typeorm-portfolio.repository.ts` para garantizar que la transacción sea `READ ONLY`, no use `FOR UPDATE` ni métodos de escritura y no consulte historial o estrategias inactivas.

**Checkpoint**: Las dos historias devuelven el contrato completo, protegen el ownership y dejan
idénticos los snapshots persistidos.

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Completar documentación y verificación final sin ampliar el alcance.

- [X] T020 [P] Actualizar `docs/postman/football-player-market.postman_collection.json` con la variable `userId`, la request autenticada `GET /users/{{userId}}/portfolio` y aserciones de status, orden y strings decimales; no modificar requests de compra/venta.
- [X] T021 [P] Verificar que `backend/src/portfolio/portfolio.controller.ts` publique exactamente el contrato de `specs/013-portfolio-usuario/contracts/portfolio.md` y que no aparezcan rutas nuevas en Swagger fuera del endpoint solicitado.
- [X] T022 Ejecutar la validación de `specs/013-portfolio-usuario/quickstart.md`, `npm run build` y las suites nuevas de `backend/test/unit/`, `backend/test/integration/portfolio/` y documentación; registrar fallas sin modificar tests existentes.
- [X] T023 Verificar en `backend/migrations/`, `backend/src/` y `backend/test/` que la implementación no agregue migraciones/tablas ni modifique saldos, tokens, tenencias, cotizaciones o transacciones; revisar además `git diff` para confirmar que no se tocaron tests existentes.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001–T002 pueden ejecutarse en paralelo.
- **Foundational (Phase 2)**: T003–T005 dependen de la estructura inicial y bloquean las historias.
- **User Story 1 (Phase 3)**: T006–T015 dependen de T003–T005; T013–T014 dependen de T008–T012.
- **User Story 2 (Phase 4)**: T016–T019 dependen de T013–T015 y endurecen el mismo caso de uso.
- **Polish (Phase 5)**: T020–T023 dependen de las dos historias completas.

### User Story Dependencies

- **US1 (P1)**: independiente después de la fase fundacional; es el MVP.
- **US2 (P1)**: depende del endpoint y del dominio de US1 porque agrega ownership, errores de estado y pruebas de no escritura en el mismo `portfolio.spec.ts`.

### Within Each User Story

- Escribir tests antes de implementar el comportamiento que cubren.
- Definir dominio y read model antes del Service; Service antes del Controller.
- Completar la integración y el checkpoint de cada historia antes de pasar a la siguiente.

## Parallel Opportunities

- **Setup**: T001 y T002.
- **US1 tests**: T006 y T007; no editan los mismos archivos de implementación.
- **US1 implementación**: T008/T012 pueden trabajarse en paralelo; T010/T011 dependen del puerto T005; T013/T014 esperan dominio, repository y DTO.
- **US2 implementación**: T017, T018 y T019 pueden trabajarse en paralelo en Service, dominio y repository; T016 debe precederlos.
- **Polish**: T020 y T021 pueden ejecutarse en paralelo; T022/T023 son verificaciones finales.

## Implementation Strategy

### MVP First (US1)

1. Completar Setup y Foundational.
2. Implementar dominio, repository, DTO, Service y Controller de US1.
3. Ejecutar tests unitarios, OpenAPI e integración de US1.
4. Validar que el endpoint calcula el portfolio sin escrituras.

### Incremental Delivery

1. Agregar US2 para ownership, errores `401/403/404/409/422` y snapshots de solo lectura.
2. Actualizar Postman y ejecutar quickstart, build y verificación de alcance.
3. Detenerse ante cualquier modificación de tests existentes o cualquier necesidad de migración:
   ambas situaciones quedan fuera de esta feature y requieren autorización explícita.

## Notes

- `[P]` indica tareas paralelizables sin compartir archivos incompletos.
- Cada tarea tiene ID secuencial, etiqueta de historia cuando corresponde y rutas concretas.
- No se implementan FIFO, costo promedio de ventas, historial de transacciones, endpoints de
  escritura, caché ni optimizaciones.
