---

description: "Tareas de implementación para la venta de tokens de jugador"
---

# Tasks: Vender tokens de jugador

**Input**: Documentos de diseño de `/specs/012-market-sell/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md` y
`contracts/sell-order.md`.

**Tests**: Incluidos porque la especificación exige pruebas unitarias, integración con
PostgreSQL/Testcontainers, HTTP con Supertest, concurrencia, rollback, idempotencia y recálculo
concurrente.

**Alcance protegido**: solo se adaptan tests existentes de Mercado que referencian las tablas
reemplazadas; no se eliminan tests ni se modifican tests ajenos a Mercado. No se agregan portfolio,
historial público, frontend ni tipos de transacción distintos de `COMPRA` y `VENTA`.

## Phase 1: Setup (Contratos compartidos)

**Purpose**: Preparar los tipos y entidades comunes sin alterar todavía el comportamiento HTTP.

- [X] T001 [P] Definir `TipoTransaccionMercado` limitado a `COMPRA` y `VENTA` y el snapshot inmutable compartido en `backend/src/orders/domain/transaccion-mercado.ts`, incluyendo partes, jugador, cantidad, cotización, estrategia, versión, `idRecalculo`, importe, fecha y clave normalizada.
- [X] T002 [P] Crear las entidades de persistencia comunes en `backend/src/orders/persistence/transaccion-mercado-registro.entity.ts`, `backend/src/orders/persistence/transaccion-mercado.entity.ts` y `backend/src/orders/persistence/auditoria-transaccion.entity.ts`, con FKs, unicidades, índices y auditoría append-only.

---

## Phase 2: Foundational (Persistencia y continuidad)

**Purpose**: Completar los prerrequisitos que bloquean las tres historias de usuario.

**⚠️ CRITICAL**: Ninguna historia puede considerarse implementable hasta terminar esta fase.

- [X] T003 Crear `backend/migrations/1790275844000-CreateTransaccionesMercado.ts` para crear `transacciones_mercado` y `auditorias_transaccion`, copiar `ordenes_compra` y `auditorias_orden_compra` con `tipo = COMPRA`, conservar snapshots/fechas/claves, agregar FKs/índices/unicidades/triggers append-only y crear el trigger `trg_saldos_usuario_rol_integridad` que consulte el rol relacionado: debe rechazar con error de integridad todo saldo negativo de un usuario común y permitirlo para el superadmin. Reemplazar o adaptar el `CHECK` global que impide cualquier saldo negativo y retirar las tablas antiguas solo después de copiar los datos.
- [X] T004 Registrar las entidades comunes y retirar las referencias de entidades antiguas en `backend/src/database/data-source.ts` y `backend/src/players/players.module.ts`, manteniendo únicamente los tipos `COMPRA` y `VENTA`.
- [X] T005 Implementar el value object exacto con signo en `backend/src/users/domain/saldo-exacto.ts` y adaptar `backend/src/users/domain/saldo-usuario.ts` y `backend/src/users/persistence/saldo-usuario.entity.ts` para rechazar únicamente el saldo insuficiente del usuario común, permitir saldo inexistente/cero/negativo del superadmin y crear su saldo ausente dentro de la venta. El dominio debe conservar esta regla y el trigger de T003 debe actuar como protección persistente complementaria.
- [X] T006 Extender `backend/src/orders/orders.repository.ts` con contextos y operaciones de UoW para transacciones comunes, compra y venta, incluyendo snapshot de cotización activa, transacción existente y el orden único de locks.
- [X] T007 Refactorizar `backend/src/orders/persistence/typeorm-orders.repository.ts` para leer/escribir las tablas comunes, reutilizar el resolver de cotización activa sin historial ni fallback, mapear `COMPRA`/`VENTA` y limitar el repository a cargar, bloquear y persistir sin decisiones de negocio.
- [X] T008 Adaptar `backend/src/orders/domain/orden-compra.ts` para producir el snapshot común `COMPRA` y conservar exactamente el contrato y las reglas existentes de compra.
- [X] T009 Actualizar `backend/test/integration/orders/orders-integration-app.ts` para registrar las entidades nuevas, aplicar el esquema migrado y truncar las tablas comunes en el orden correcto sin tocar apps de integración ajenas a Mercado.
- [X] T010 [P] Adaptar, con autorización de esta feature, `backend/test/integration/orders/buy-order.spec.ts` para consultar `transacciones_mercado` y `auditorias_transaccion`, conservando las pruebas de compra, rollback y ausencia de efectos.
- [X] T011 [P] Adaptar, con autorización de esta feature, `backend/test/integration/orders/buy-order-idempotency.spec.ts` y `backend/test/integration/orders/orders-repository.spec.ts` a la clave común y al registro `tipo = COMPRA`, sin eliminar cobertura.
- [X] T012 [P] Adaptar, con autorización de esta feature, `backend/test/integration/orders/quote-recalculation-concurrency.spec.ts` y `backend/test/integration/orders/schema-constraints.spec.ts` para validar locks, snapshot de cotización, constraints y triggers sobre las tablas comunes.
- [X] T013 [P] Adaptar, con autorización de esta feature, `backend/test/unit/orders/orden-compra.spec.ts` y `backend/test/unit/orders/orders.service.spec.ts` al snapshot/UoW común, preservando comportamiento y aserciones de compra.
- [X] T014 [P] Cubrir el saldo firmado y la excepción exclusiva del superadmin en `backend/test/unit/users/saldo-exacto.spec.ts` y `backend/test/unit/users/saldo-usuario.spec.ts`, sin borrar casos existentes.
- [X] T015 [P] Agregar pruebas PostgreSQL/Testcontainers en `backend/test/integration/orders/saldo-superadmin-integrity.spec.ts` para permitir saldo negativo al superadmin y rechazar con error de integridad el saldo negativo de usuarios comunes, verificando que el trigger consulte el rol relacionado.

**Checkpoint**: La migración conserva compras existentes, el repository usa una única persistencia
común, el saldo protege la excepción del superadmin y los tests de `market-buy` adaptados siguen
verificando el contrato anterior.

---

## Phase 3: User Story 1 - Vender tokens al superadmin (Priority: P1) 🎯 MVP

**Goal**: Permitir que un usuario común autenticado venda tokens propios al superadmin usando la
cotización activa, transfiriendo tokens/tenencias y acreditando el importe exacto en una operación
común atómica e idempotente.

**Independent Test**: Con un jugador, cotización activa, tenencia suficiente y JWT de usuario
común, ejecutar `POST /orders/sell` con una clave nueva y verificar `201`, tokens individuales,
tenencias, saldo del usuario, saldo posiblemente negativo del superadmin y registro `VENTA`.

### Tests for User Story 1

- [X] T016 [P] [US1] Crear tests unitarios del modelo de venta en `backend/test/unit/orders/orden-venta.spec.ts` para venta parcial/total, importe exacto, transferencia determinista de tokens, tenencias, snapshot activo, replay y débito negativo del superadmin.
- [X] T017 [P] [US1] Crear la única tarea que modifica `backend/test/integration/orders/sell-order.spec.ts`: prueba PostgreSQL/Testcontainers y Supertest del flujo válido, venta parcial/total, venta válida sin saldo suficiente del superadmin —incluido saldo ausente o cero—, acreditación/debito exactos, respuesta exacta de `buy`, identificación de comprador/vendedor, transferencia única por token y suma total de 100.
- [X] T018 [US1] Extender `backend/test/unit/orders/orders.service.spec.ts` con el caso `vender`, verificando carga de usuario/superadmin/jugador, cotización activa, reintentos serializables y mapeo de errores sin colocar reglas de dominio en el Service.

### Implementation for User Story 1

- [X] T019 [US1] Implementar `OrdenVenta` en `backend/src/orders/domain/orden-venta.ts` con invariantes de vendedor común, comprador superadmin, cantidad, tenencia individual, importe exacto, transferencia, saldos, idempotencia y snapshot `VENTA`, sin conocer NestJS, HTTP ni PostgreSQL.
- [X] T020 [US1] Implementar en `backend/src/orders/persistence/typeorm-orders.repository.ts` la carga bloqueada y persistencia de venta: usuario vendedor, superadmin, jugador, cotización activa, tokens por `numero_emision`, tenencias, saldos y transacción/auditoría comunes.
- [X] T021 [US1] Agregar `vender` a `backend/src/orders/orders.service.ts` para orquestar la UoW, reutilizar autenticación/configuración, cotización activa e `Idempotency-Key`, reintentar solo `40001`/`40P01` hasta tres veces y mapear errores HTTP.
- [X] T022 [US1] Agregar `POST /orders/sell` en `backend/src/orders/orders.controller.ts` reutilizando `JwtAuthGuard`, `BuyOrderDto`, `IdempotencyKeyPipe` y `BuyOrderResponseDto`; el Controller solo debe delegar y documentar el contrato Swagger.

**Checkpoint**: El MVP permite una venta válida completa y verificable sin agregar endpoints de
lectura, autenticación nueva ni tipos de transacción nuevos.

---

## Phase 4: User Story 2 - Rechazar ventas inviables sin efectos parciales (Priority: P1)

**Goal**: Rechazar autenticación, permisos, body, clave, tenencia o cotización inválidos con el
código documentado, sin mutar tokens, tenencias, saldos, transacciones ni auditorías.

**Independent Test**: Repetir `POST /orders/sell` con cada condición inválida y verificar `401`,
`403`, `404`, `409` o `422`, además de comparar todo el estado del mercado antes y después.

### Tests for User Story 2

- [X] T023 [US2] Agregar casos unitarios de cantidad, jugador, usuario, superadmin, tenencia, cotización y clave incompatible en `backend/test/unit/orders/orden-venta.spec.ts` y `backend/test/unit/orders/orders.service.spec.ts`.
- [X] T024 [P] [US2] Verificar en `backend/test/unit/orders/idempotency-key.pipe.spec.ts` las reglas compartidas de normalización y reutilización para `sell`, manteniendo el header obligatorio y sin duplicar un pipe nuevo.
- [X] T025 [US2] Crear `backend/test/integration/orders/sell-order-errors.spec.ts` con Supertest para JWT ausente/inválido, superadmin vendedor, jugador inexistente, body/cantidad inválidos, `Idempotency-Key` inválido, tenencia insuficiente, cotización ausente y ausencia de efectos parciales, sin duplicar casos de la suite de venta válida.

### Implementation for User Story 2

- [X] T026 [US2] Ajustar `backend/src/orders/orders.service.ts`, `backend/src/orders/domain/orden-venta.ts`, `backend/src/orders/pipes/idempotency-key.pipe.ts`, `backend/src/orders/dto/buy-order.dto.ts` y `backend/src/orders/persistence/typeorm-orders.repository.ts` para separar validación de entrada, existencia/orquestación e invariantes: rechazar únicamente si el saldo del usuario común es insuficiente, nunca validar ni exigir saldo del superadmin, permitir que no exista/sea cero/negativo y acreditar/debitar siempre el importe exacto en una venta válida, sin consultar cotizaciones históricas como fallback.

**Checkpoint**: Los errores de venta están cubiertos por HTTP y dominio, y toda petición rechazada
deja intacto el estado persistido.

---

## Phase 5: User Story 3 - Consistencia ante concurrencia y fallas (Priority: P1)

**Goal**: Garantizar serialización, rollback, replay único y snapshot coherente frente a ventas,
compras y recálculos concurrentes.

**Independent Test**: Ejecutar ventas concurrentes, mezclar compra/venta, repetir claves, provocar
fallas de persistencia y competir con un recálculo; verificar suministro 100, propietarios únicos,
tenencias consistentes, registros únicos y ausencia de cambios parciales.

### Tests for User Story 3

- [X] T027 [P] [US3] Crear `backend/test/integration/orders/sell-order-idempotency.spec.ts` con replay de venta confirmada, conflicto por payload/actor/tipo y conflicto entre una clave de compra y una venta, sin duplicar transacción ni auditoría.
- [X] T028 [P] [US3] Crear `backend/test/integration/orders/sell-order-rollback.spec.ts` con fallas inyectadas en token, tenencia, saldo, transacción y auditoría, verificando rollback total y posibilidad de reintento.
- [X] T029 [P] [US3] Crear `backend/test/integration/orders/sell-order-concurrency.spec.ts` con PostgreSQL/Testcontainers para ventas concurrentes, compra/venta sobre el mismo jugador y venta/recálculo con snapshot activo; comprobar locks, suministro, saldos y tenencias.

### Implementation for User Story 3

- [X] T030 [US3] Completar el orden único de locks y reintentos en `backend/src/orders/persistence/typeorm-orders.repository.ts` y `backend/src/orders/orders.service.ts`: clave idempotente, estrategia/jugador/cotización, usuarios/saldos por UUID, tokens por emisión, tenencias y escrituras finales.
- [X] T031 [US3] Asegurar en `backend/src/orders/persistence/typeorm-orders.repository.ts`, `backend/src/orders/persistence/transaccion-mercado.entity.ts`, `backend/src/orders/persistence/auditoria-transaccion.entity.ts` y `backend/migrations/1790275844000-CreateTransaccionesMercado.ts` que la UoW escriba operación/auditoría como unidad atómica, que la auditoría sea append-only y que las restricciones eviten duplicados o tipos no permitidos.

**Checkpoint**: Las carreras y fallas controladas conservan tokens, tenencias, saldos y registros
consistentes; solo el superadmin puede quedar con saldo negativo.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cerrar documentación, verificación completa y controles de alcance.

- [X] T032 [P] Actualizar `backend/test/unit/documentation/orders-openapi.spec.ts` y `backend/test/integration/documentation/swagger-openapi.spec.ts` para verificar `POST /orders/sell`, Bearer, `Idempotency-Key`, schemas, respuesta `201` y errores `401/403/404/409/422`, manteniendo también `POST /orders/buy`.
- [X] T033 [P] Actualizar `docs/postman/market-orders.postman_collection.json` con autenticación común, venta parcial, replay idempotente, clave incompatible y aserciones de operación, saldo y tenencias, sin quitar casos de compra.
- [X] T034 Ejecutar y documentar en `specs/012-market-sell/quickstart.md` la validación desde `backend/package.json`: `npm run build`, tests unitarios, integración PostgreSQL/Testcontainers, lint, Swagger y Postman; dejar evidencia de que no se modificaron tests ajenos a Mercado.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 y T002 no dependen de otras tareas y pueden comenzar en paralelo.
- **Foundational (Phase 2)**: T003–T015 dependen de los contratos de Phase 1 y bloquean todas las historias.
- **User Story 1 (Phase 3)**: depende de Phase 2; entrega el MVP de venta válida.
- **User Story 2 (Phase 4)**: depende del endpoint y dominio base de US1; agrega validaciones y rechazos sin efectos.
- **User Story 3 (Phase 5)**: depende del flujo válido y de los errores de US1/US2; agrega concurrencia, rollback y recálculo.
- **Polish (Phase 6)**: depende de las tres historias y de la persistencia común final.

### User Story Dependencies

- **US1 (P1)**: depende de T001–T015; no depende de otra historia.
- **US2 (P1)**: depende de T019–T022 de US1 para probar el endpoint real; no agrega otra contraparte ni otro mecanismo de autenticación.
- **US3 (P1)**: depende de T020–T022 y de la migración; coordina compra, venta y recálculo mediante la UoW compartida.

### Parallel Opportunities

- T001 y T002 pueden ejecutarse en paralelo.
- T010–T015 pueden repartirse por archivo una vez disponibles la migración y el harness de integración.
- En US1, T016 y T017 pueden prepararse en paralelo; T018 trabaja sobre los tests de Service.
- En US3, T027, T028 y T029 son pruebas independientes y pueden ejecutarse en paralelo antes de ajustar locks/persistencia.
- T032 y T033 son actualizaciones independientes de documentación/verificación.

## Parallel Example: User Story 1

```text
T016: tests unitarios de OrdenVenta en backend/test/unit/orders/orden-venta.spec.ts
T018: tests del caso de uso en backend/test/unit/orders/orders.service.spec.ts
T017: única prueba PostgreSQL/Testcontainers + Supertest en backend/test/integration/orders/sell-order.spec.ts
```

## Parallel Example: User Story 3

```text
T027: idempotencia en backend/test/integration/orders/sell-order-idempotency.spec.ts
T028: rollback en backend/test/integration/orders/sell-order-rollback.spec.ts
T029: concurrencia y recálculo en backend/test/integration/orders/sell-order-concurrency.spec.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1 y Phase 2, incluida la migración conservadora de compras existentes y el trigger de saldo por rol.
2. Implementar US1: dominio de venta, repository/UoW, Service, Controller y prueba feliz.
3. Ejecutar las pruebas independientes de US1 y de integridad de saldo; verificar que una venta válida acredita/debita el importe exacto aunque el saldo del superadmin no exista o quede negativo.
4. Detenerse para validar el MVP antes de agregar errores avanzados y concurrencia.

### Incremental Delivery

1. Foundation lista: compras existentes preservadas y persistencia común funcionando.
2. US1: venta válida autenticada y auditable.
3. US2: errores HTTP, validación de entrada y ausencia de efectos parciales.
4. US3: idempotencia bajo carrera, rollback, locks y recálculo concurrente.
5. Polish: Swagger, Postman, build, tests, lint y quickstart.

### Parallel Team Strategy

1. Una persona puede completar T001–T009 y otra preparar T010–T014 cuando el esquema común esté acordado.
2. Después de Foundation, una persona puede implementar US1 mientras otra prepara los tests de documentación; no se deben editar los mismos archivos en paralelo.
3. En US3, dividir T027–T029 por archivo y ejecutar la implementación de locks después de que las pruebas fallen de forma reproducible.

## Notes

- Todas las tareas cumplen el formato `- [ ] T### [P?] [US#] descripción con ruta`.
- El Controller delega; DTO/pipe valida; Service resuelve existencias y orquesta; dominio mantiene invariantes; repositories no deciden reglas de negocio.
- La autorización de adaptar `market-buy` aplica solo a los tests de Mercado que consultan `ordenes_compra`/`auditorias_orden_compra`; no se eliminan tests ni se tocan tests ajenos.
- No se deben agregar endpoints de portfolio/historial, frontend, mecanismos de autenticación nuevos ni tipos de transacción fuera de `COMPRA` y `VENTA`.
