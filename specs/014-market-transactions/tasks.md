---

description: "Tareas de implementación para el historial de operaciones de Mercado"
---

# Tasks: Historial de operaciones de Mercado

**Input**: Design documents from `/specs/014-market-transactions/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [transactions-history.md](./contracts/transactions-history.md)
y [quickstart.md](./quickstart.md).

**Scope guard**: No crear tablas ni migraciones; no agregar filtros, paginación o exportación; no
modificar compras, ventas, portfolio ni tests existentes.

## Phase 1: Setup

**Purpose**: Preparar los directorios de la nueva feature sin alterar módulos existentes.

- [X] T001 Crear los directorios `backend/src/market/transactions/`, `backend/src/market/transactions/dto/`, `backend/src/market/transactions/persistence/`, `backend/test/unit/market/transactions/` y `backend/test/integration/market/transactions/` según [plan.md](./plan.md).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir el read model y la integración mínima con la infraestructura existente antes
de implementar las historias.

- [X] T002 Definir la interfaz `TRANSACTIONS_REPOSITORY` y el read model de usuario/operaciones en `backend/src/market/transactions/transactions.repository.ts`, reutilizando `TransaccionMercadoSnapshot` y `TipoTransaccionMercado` sin exponer metadatos internos.
- [X] T003 Definir `TransactionsResponseDto` y `TransactionResponseDto` en `backend/src/market/transactions/dto/transactions-response.dto.ts`, con únicamente `usuarioId`, `idOperacion`, `tipo`, `idJugador`, `nombreCompleto`, `cantidadTokens`, `cotizacion`, `importe` y `fechaHora`, incluyendo lista vacía y strings monetarios de dos posiciones.
- [X] T004 Implementar el repositorio de lectura en `backend/src/market/transactions/persistence/typeorm-transactions.repository.ts`: consultar `usuarios` únicamente para comprobar la existencia del usuario autenticado y decidir el `404`; obtener operaciones y snapshots exclusivamente de `transacciones_mercado`, enriquecer solo `nombreCompleto` desde `jugadores`, filtrar por comprador o vendedor, usar `REPEATABLE READ` con `SET TRANSACTION READ ONLY`, ordenar por `fecha_hora DESC, id_operacion ASC`, sin escrituras ni recálculos.
- [X] T005 Crear `TransactionsModule` en `backend/src/market/transactions/transactions.module.ts` e integrarlo en el agregado `MarketModule` (`backend/src/market/market.module.ts`), dejando `AppModule` como punto de composición, importando `AuthModule` y `PlayersModule`, inyectando `PLAYERS_DATA_SOURCE` y sin agregar entidades, migraciones ni dependencias nuevas.

**Checkpoint**: el read model, DTO, repositorio de solo lectura y wiring del módulo están listos
para las historias de usuario.

---

## Phase 3: User Story 1 - Consultar el historial propio (Priority: P1) 🎯 MVP

**Goal**: Exponer el historial autenticado con compras y ventas del usuario, ordenado y con los
snapshots monetarios exactos del registro persistido.

**Independent Test**: Con una compra y una venta del mismo usuario, invocar el endpoint propio y
verificar `200`, los ocho campos públicos, el orden definido y `operaciones: []` para un usuario
sin historial.

### Tests for User Story 1

- [X] T006 [P] [US1] Agregar tests unitarios de la proyección pública en `backend/test/unit/market/transactions/transactions-response.spec.ts`: tipos `COMPRA`/`VENTA`, `nombreCompleto`, campos permitidos, lista vacía, orden estable y formato exacto de `Cotizacion`/`Creditos` sin punto flotante ni recálculo.
- [X] T007 [P] [US1] Agregar tests HTTP con Supertest y PostgreSQL/Testcontainers en `backend/test/integration/market/transactions/transactions.spec.ts` usando `createOrdersIntegrationApp()`: probar el caso feliz `200` mediante HTTP, incluyendo operaciones de ambos tipos, `idJugador` y `nombreCompleto`, pertenencia como comprador y vendedor, fechas iguales/diferentes, orden `fecha_hora DESC, id_operacion ASC` y usuario sin operaciones.

### Implementation for User Story 1

- [X] T008 [US1] Implementar `TransactionsService.consultar` en `backend/src/market/transactions/transactions.service.ts`: delegar ownership a `OwnershipService`, resolver `404` solo para el usuario propio inexistente, mapear snapshots con `Cotizacion.fromDecimal` y `Creditos.fromUnidades`, incluir `nombreCompleto` del jugador y devolver únicamente el contrato público sin leer portfolio ni cotizaciones.
- [X] T009 [US1] Implementar `GET /users/:id/transactions` en `backend/src/market/transactions/transactions.controller.ts` con `JwtAuthGuard`, `ParseUUIDPipe` configurado para `422` y delegación exclusiva al Service.

**Checkpoint**: la User Story 1 queda demostrable con `200`, compras, ventas, orden determinista
y lista vacía, sin modificar el estado del Mercado.

---

## Phase 4: User Story 2 - Proteger privacidad e inmutabilidad (Priority: P1)

**Goal**: Garantizar ownership, errores documentados, aislamiento entre usuarios y ausencia total
de escrituras durante consultas exitosas o rechazadas.

**Independent Test**: Ejecutar requests con JWT ausente/inválido, UUID ajeno, usuario propio
inexistente, UUID inválido y snapshot inconsistente; comparar antes y después todas las tablas de
Mercado consultadas.

### Tests for User Story 2

- [X] T010 [P] [US2] Agregar tests unitarios del Service en `backend/test/unit/market/transactions/transactions.service.spec.ts`: `OwnershipService` antes del Repository, `403` para otro usuario, `404` para identidad propia inexistente, `409` sin respuesta parcial y aislamiento del read model.
- [X] T011 [P] [US2] Agregar tests HTTP con Supertest en `backend/test/integration/market/transactions/transactions-errors.spec.ts` para `401`, `403`, `404`, `409` y `422`; cubrir el `409` con un contexto de Repository controlado sin alterar el esquema persistido.
- [X] T012 [P] [US2] Agregar tests de integración de solo lectura en `backend/test/integration/market/transactions/transactions-read-only.spec.ts` con PostgreSQL/Testcontainers: comparar snapshots de `transacciones_mercado`, `auditorias_transaccion`, saldos, tokens, tenencias y cotizaciones, y verificar que un usuario no recibe operaciones ajenas.

### Implementation for User Story 2

- [X] T013 [US2] Completar en `backend/src/market/transactions/transactions.service.ts` el mapeo de errores `401`/`403`/`404`/`409`/`422` y la regla de no devolver una lista parcial ante un snapshot incompatible, sin trasladar reglas de negocio al Repository.
- [X] T014 [US2] Verificar en `backend/src/market/transactions/persistence/typeorm-transactions.repository.ts` que las operaciones y snapshots provengan exclusivamente de `transacciones_mercado`, que `jugadores` solo se use para `nombreCompleto`, que `usuarios` solo se use para decidir el `404`, y que la lectura use la transacción `READ ONLY`, parámetros de usuario, filtro comprador/vendedor y orden contractual sin invocar `save`, `insert`, `update`, `delete` ni consultar auditorías, portfolio o cotizaciones.

**Checkpoint**: ambas historias P1 están protegidas por autenticación/ownership, cubren los
errores documentados y demuestran que la lectura no escribe ni filtra operaciones de otros usuarios.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Cerrar el contrato público, la documentación obligatoria y la evidencia de terminado.

- [X] T015 [P] Agregar anotaciones Swagger/OpenAPI para ruta, Bearer, UUID, schema de `200`, lista vacía y errores `401`, `403`, `404`, `409` y `422` en `backend/src/market/transactions/transactions.controller.ts`, y cubrirlas en `backend/test/unit/documentation/market/transactions-openapi.spec.ts`.
- [X] T016 [P] Agregar la request autenticada “Consultar historial de operaciones” y sus aserciones de campos, tipos, `nombreCompleto`, strings decimales y orden en `docs/postman/football-player-market.postman_collection.json`, dentro de una sección propia sin duplicar la colección existente.
- [X] T017 Ejecutar las validaciones de `specs/014-market-transactions/quickstart.md` desde `backend/package.json` (`test:unit`, OpenAPI, integración y `build`) y registrar en el handoff la evidencia de resultados; no modificar tests existentes ni documentos de diseño.
- [X] T018 Revisar el diff de `backend/src/`, `backend/test/`, `backend/migrations/` y `docs/postman/football-player-market.postman_collection.json` para confirmar que solo se agregaron los archivos de la feature, que no hay migraciones/tablas nuevas y que compras, ventas y portfolio permanecen sin cambios.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 no depende de otras tareas.
- **Foundational (Phase 2)**: T002 y T003 pueden comenzar después de T001; T004 depende de T002; T005 depende de T002, T003 y T004.
- **User Story 1 (Phase 3)**: T006 y T007 dependen de Phase 2 y pueden ejecutarse en paralelo; T008 depende de T002–T004 y los tests de US1; T009 depende de T005 y T008.
- **User Story 2 (Phase 4)**: T010–T012 dependen de T009 y pueden ejecutarse en paralelo porque usan archivos distintos; T013 depende de T010/T011; T014 depende de T012/T013.
- **Polish (Phase 5)**: T015 y T016 dependen de T009 y pueden ejecutarse en paralelo; T017 y T018 dependen de todas las tareas de implementación y pruebas.

### User Story Dependencies

- **US1 (P1)**: inicia después de Phase 2 y entrega el MVP funcional de consulta.
- **US2 (P1)**: depende de la ruta de US1 para validar seguridad HTTP. Sus pruebas permanecen separadas por responsabilidad: `transactions-errors.spec.ts` cubre errores HTTP y `transactions-read-only.spec.ts` cubre aislamiento/escrituras; `transactions.spec.ts` queda reservado al flujo feliz, orden y lista vacía.
- El MVP recomendado incluye US1 y el mínimo de US2 de autenticación/ownership, porque un historial sin aislamiento no es entregable según la Constitución.

### Parallel Opportunities

- T002 y T003 pueden trabajarse en paralelo.
- T006 y T007 pueden trabajarse en paralelo.
- T010, T011 y T012 pueden trabajarse en paralelo.
- T015 y T016 pueden trabajarse en paralelo.

---

## Parallel Example: User Story 1

```text
Task T006: Unit tests for DTO projection in backend/test/unit/market/transactions/transactions-response.spec.ts
Task T007: PostgreSQL/Testcontainers happy-path tests in backend/test/integration/market/transactions/transactions.spec.ts
```

## Parallel Example: User Story 2

```text
Task T010: Service authorization/error unit tests in backend/test/unit/market/transactions/transactions.service.spec.ts
Task T011: Supertest HTTP error tests in backend/test/integration/market/transactions/transactions-errors.spec.ts
Task T012: PostgreSQL read-only/isolation tests in backend/test/integration/market/transactions/transactions-read-only.spec.ts
```

---

## Implementation Strategy

### MVP First

1. Completar Phase 1 y Phase 2.
2. Implementar US1 con consulta de compras/ventas, orden y mapeo exacto.
3. Completar el mínimo obligatorio de US2: JWT, ownership, UUID, existencia y ausencia de escrituras.
4. Ejecutar las pruebas independientes de ambas historias antes de documentación final.

### Incremental Delivery

1. Entregar el read model y el módulo cableado.
2. Entregar US1 con `200` y lista vacía.
3. Completar US2 con aislamiento, errores y lectura `READ ONLY`.
4. Cerrar Swagger/OpenAPI, Postman, build y evidencia de la Constitución.

## Notes

- Todas las tareas usan el formato requerido `- [ ] Txxx [P?] [US?] descripción con ruta`.
- Las tareas de tests son obligatorias porque `spec.md` las solicita explícitamente.
- No se debe modificar ni eliminar ningún test existente; cualquier adaptación futura requiere aprobación explícita.
