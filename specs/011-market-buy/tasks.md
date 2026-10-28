# Tareas: Comprar tokens de jugador

**Entrada**: Documentos de diseño de `specs/011-market-buy/`

**Prerrequisitos**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` y
`quickstart.md`.

**Organización**: Las tareas están ordenadas por dependencia y agrupadas por user story. No se
modifican tests existentes; las suites nuevas se agregan en los paths indicados.

## Phase 1: Setup

**Objetivo**: preparar la estructura de código y pruebas sin agregar dependencias nuevas.

- [X] T001 [P] Crear los directorios de órdenes y documentación de pruebas en `backend/src/orders/`, `backend/test/unit/orders/`, `backend/test/integration/orders/`, `backend/test/unit/documentation/` y `docs/postman/`, siguiendo `specs/011-market-buy/plan.md`.
- [X] T002 [P] Confirmar en `backend/package.json` que TypeORM, class-validator, Swagger, Jest, Supertest y Testcontainers cubren la feature, sin agregar mecanismos de autenticación ni dependencias paralelas.

---

## Phase 2: Foundational (bloqueante)

**Objetivo**: dejar disponible el esquema, el datasource transaccional, el contrato de persistencia y
la resolución exacta de cotización antes de implementar cualquier user story.

**Dependencia**: T001–T002.

- [X] T003 [P] Crear `backend/migrations/1790275843000-CreateOrdenesCompra.ts` con las tablas `ordenes_compra` y `auditorias_orden_compra`, FK, checks, índices por idempotencia/jugador/comprador/fecha y triggers que rechacen `UPDATE`/`DELETE`.
- [X] T004 [P] Crear `backend/src/orders/persistence/orden-compra.entity.ts` y `backend/src/orders/persistence/auditoria-orden-compra.entity.ts` con los campos exactos del modelo, importe `bigint`, cotización `numeric(14,2)` y restricciones de unicidad.
- [X] T005 Registrar `SaldoUsuarioEntity` y las entidades de órdenes en el `PLAYERS_DATA_SOURCE` de `backend/src/players/players.module.ts`, en `backend/src/database/data-source.ts` y en los módulos correspondientes; ajustar `backend/src/players/persistence/cotizacion-vigente.entity.ts` para transformar `numeric` a `Cotizacion` sin alterar la presentación numérica legacy del ranking.
- [X] T006 Definir `ORDERS_REPOSITORY`, `ActiveQuoteSnapshot`, `ActiveQuoteResolver`, `LockedBuyContext` y la UoW transaccional en `backend/src/orders/orders.repository.ts`, con locks, lecturas exactas, objetos opcionales para estados ausentes y persistencia append-only; documentar que el Service comprueba ausencias y el dominio decide reglas, sin validaciones de negocio en la UoW.
- [X] T007 Implementar en `backend/src/orders/persistence/typeorm-orders.repository.ts` el esqueleto de `DataSource.transaction`, los locks y consultas de idempotencia, estrategia/cotización, usuarios, saldos, tokens y tenencias, más el mapeo a objetos de dominio; devolver ausencias sin rechazarlas y no consultar historial/ranking.
- [X] T008 Crear `backend/test/integration/orders/orders-integration-app.ts` con PostgreSQL 16/Testcontainers, la lista completa de migraciones/entidades, `dropSchema`, reset y cierre propios, sin modificar `backend/test/integration/helpers/integration-app.ts` ni `backend/test/integration/players/players-integration-app.ts`.
- [X] T009 [P] Agregar `backend/test/unit/orders/quote-resolver.spec.ts` para verificar estrategia activa ausente, cotización ausente o desalineada, rechazo de fallback al historial/otra estrategia y conservación exacta de `Cotizacion`.

**Checkpoint**: la base, el datasource compartido, la UoW y el resolver de cotización están listos;
ninguna user story debe saltarse esta fase.

---

## Phase 3: User Story 1 — Comprar tokens al superadmin (Prioridad: P1, MVP)

**Objetivo**: completar una compra válida de tokens con débito, acreditación, tenencias, operación
y auditoría dentro de una única transacción.

**Dependencias**: Phase 2 completa.

**Prueba independiente**: jugador inicializado, estrategia/cotización activa, superadmin con tokens
disponibles y usuario común con saldo suficiente; `POST /orders/buy` responde `201` con strings
exactos y el estado persistido coincide con la compra.

### Tests de User Story 1

- [X] T010 [P] [US1] Escribir primero los tests unitarios del dominio para validar comprador/vendedor, cantidad, cotización, importe exacto, saldo, disponibilidad, tenencias, transferencia individual, replay/conflicto de idempotencia y resultado inmutable en `backend/test/unit/orders/orden-compra.spec.ts`.
- [X] T011 [P] [US1] Escribir primero los tests unitarios del Service para existencia del comprador del JWT, superadmin configurado, jugador, cotización, saldos y tenencias, orquestación de la UoW y mapeo de ausencias sin reglas de saldo, disponibilidad o idempotencia en `backend/test/unit/orders/orders.service.spec.ts`; agregar los casos del pipe para header ausente, vacío, espacios, longitud, caracteres inválidos y valor válido normalizado en `backend/test/unit/orders/idempotency-key.pipe.spec.ts`.
- [X] T012 [P] [US1] Escribir primero el contrato OpenAPI para `/orders/buy`, Bearer, `Idempotency-Key`, schemas y respuestas `201/401/403/404/409/422` en `backend/test/unit/documentation/orders-openapi.spec.ts`.
- [X] T013 [P] [US1] Escribir primero el escenario HTTP de compra parcial y compra total con Supertest, verificando tokens individuales, tenencias, ambos saldos, orden, auditoría y strings exactos en `backend/test/integration/orders/buy-order.spec.ts`.

### Implementación de User Story 1

- [X] T014 [P] [US1] Implementar `backend/src/orders/domain/orden-compra.ts` como modelo rico que reciba los objetos bloqueados y ejecute la compra completa; verificar o ajustar `backend/src/users/domain/saldo-usuario.ts`, `backend/src/market/domain/token-jugador.ts` y `backend/src/market/domain/tenencia-jugador.ts` para que sus métodos protejan invariantes sin setters públicos: validar partes, cantidad, cotización, importe, saldo, disponibilidad, tenencias e idempotencia; transferir tokens, actualizar tenencias, debitar/acreditar saldos y producir un resultado inmutable.
- [X] T015 [P] [US1] Crear `backend/src/orders/dto/buy-order.dto.ts` y `backend/src/orders/dto/buy-order-response.dto.ts` para validar exclusivamente `idJugador` y `cantidadTokens` del body, y crear `backend/src/orders/pipes/idempotency-key.pipe.ts` para exigir `Idempotency-Key`, recortar laterales, validar 1–128 caracteres ASCII `[A-Za-z0-9._~-]`, rechazar cualquier otro valor con `422` y retornar la clave normalizada.
- [X] T016 [US1] Completar `backend/src/orders/persistence/typeorm-orders.repository.ts` para bloquear por el orden definido, seleccionar tokens del superadmin por emisión, cargar y mapear saldos/tenencias/usuarios/quote, y persistir las mutaciones de dominio, orden y auditoría al final de la misma transacción, sin validar viabilidad; depende de T004–T007 y T014.
- [X] T017 [US1] Implementar `backend/src/orders/orders.service.ts` para abrir la UoW, solicitar al repository el comprador identificado por JWT, superadmin, jugador, cotización vigente, saldos, tokens, tenencias y orden existente bloqueados; traducir cada ausencia técnica al error de aplicación, invocar `OrdenCompra`, solicitar la persistencia del resultado y mapear la respuesta, sin decidir saldo suficiente, comprador distinto, disponibilidad, consistencia de tenencias ni idempotencia; depende de T014–T016.
- [X] T018 [US1] Implementar `backend/src/orders/orders.controller.ts` con `POST /orders/buy`, `JwtAuthGuard`, DTO de body, `IdempotencyKeyPipe` aplicado declarativamente al header, y anotaciones Swagger; recibir la clave ya normalizada y delegar directamente en `OrdersService`, sin trimming, regex, límites ni reglas de negocio; depende de T015 y T017.
- [X] T019 [US1] Implementar `backend/src/orders/orders.module.ts` con `ORDERS_REPOSITORY`, `TypeOrmOrdersRepository`, `OrdersService`, `OrdersController`, imports de `AuthModule`/`PlayersModule`, y registrarlo en `backend/src/app.module.ts`; depende de T017–T018.
- [X] T020 [P] [US1] Crear `docs/postman/market-orders.postman_collection.json` con login de usuario, compra autenticada, variables `baseUrl`/`accessToken`/`playerId` y aserciones de `201`, importe, cotización y cantidad; depende de T018.

**Checkpoint MVP**: T010–T013 deben fallar antes de T014–T019; luego la compra válida y su
documentación deben pasar sin implementar venta, portfolio, ranking o frontend.

---

## Phase 4: User Story 2 — Rechazar compras inviables (Prioridad: P1)

**Objetivo**: rechazar autenticación, identidad, request, jugador, saldo, cotización y disponibilidad
inválidos sin dejar cambios parciales.

**Dependencias**: Phase 3 para reutilizar la ruta, el service y la UoW de compra.

**Prueba independiente**: cada error devuelve su código documentado y las consultas antes/después
confirman que no cambiaron saldos, tokens, tenencias, operación ni auditoría.

### Tests de User Story 2

- [X] T021 [US2] Agregar primero tests unitarios de `OrdenCompra` para comprador inexistente o superadmin, cantidad inválida, saldo insuficiente, jugador inexistente, cotización ausente/desalineada, disponibilidad insuficiente y tenencia inconsistente en `backend/test/unit/orders/orden-compra.spec.ts`; dejar JWT, UUID y códigos HTTP a T022.
- [X] T022 [US2] Agregar primero tests Supertest para `401`, `403`, `404`, `409` y `422` en `backend/test/integration/orders/buy-order.spec.ts`; cubrir header `Idempotency-Key` ausente, vacío, con espacios laterales/internos, de más de 128 caracteres, con caracteres inválidos y válido normalizado en `backend/test/integration/orders/buy-order-idempotency.spec.ts`, verificando que cada rechazo deje intactos tokens, tenencias, saldos, órdenes y auditorías.
- [X] T023 [P] [US2] Agregar tests de PostgreSQL para checks, FK, unicidad de idempotencia y rechazo de `UPDATE`/`DELETE` sobre operación/auditoría en `backend/test/integration/orders/schema-constraints.spec.ts`.

### Implementación de User Story 2

- [X] T024 [US2] Completar `backend/src/orders/pipes/idempotency-key.pipe.ts` con la validación de entrada y `422`, mantener `backend/src/orders/dto/buy-order.dto.ts` limitado al body, y mapear técnicamente errores de dominio a `401/403/404/409/422` desde `backend/src/orders/orders.service.ts`; mantener `backend/src/orders/orders.controller.ts` declarativo, limitado a DTO, pipe, guard y Swagger, sin trimming, regex, límites ni reglas de compra.
- [X] T025 [US2] Ajustar `backend/src/orders/persistence/typeorm-orders.repository.ts` para consultar, bloquear, cargar y mapear estrategia/cotización, comprador/superadmin, saldos, tokens y tenencias; devolver ausencias al Service sin rechazar por reglas de negocio, mantener el origen exclusivo en `recalculo_cotizacion_activo` y `cotizacion_vigente`, y dejar FK/UNIQUE/CHECK/append-only como defensa estructural.
- [X] T026 [US2] Agregar en `backend/test/integration/orders/orders-repository.spec.ts` tests PostgreSQL/Testcontainers de carga, orden de locks y persistencia de las mutaciones producidas por el dominio; verificar además en `backend/test/integration/orders/buy-order.spec.ts` que la UoW persista solo después del resultado válido y que cualquier fallo de escritura, incluido uno inyectado en operación/auditoría, revierta tokens, tenencias, saldos, orden y auditoría.

**Checkpoint**: todas las entradas inválidas y fallas persistentes quedan sin efectos; los tests de
US1 siguen pasando.

---

## Phase 5: User Story 3 — Idempotencia y concurrencia (Prioridad: P1)

**Objetivo**: garantizar replay seguro, conflictos de payload, locks determinísticos, reintentos
controlados y conservación de 100 tokens sin saldos negativos.

**Dependencias**: Phase 4 y la transacción válida de Phase 3.

**Prueba independiente**: repetir la misma clave, reutilizarla con otro payload y ejecutar compras
concurrentes; solo se confirman cantidades disponibles y cada operación aparece una vez.

### Tests de User Story 3

- [X] T027 [US3] Agregar primero tests unitarios de `OrdenCompra` para replay, conflicto por comprador/jugador/cantidad distintos y resultado inmutable; cubrir la coordinación ante pérdida de respuesta posterior al commit en `backend/test/unit/orders/orders.service.spec.ts`.
- [X] T028 [US3] Agregar primero tests Supertest con `Promise.all` para misma clave, claves distintas, disponibilidad agotada, suma de 100 tokens, tenencias consistentes y ausencia de saldos negativos en `backend/test/integration/orders/buy-order.spec.ts`; agregar en `backend/test/integration/orders/quote-recalculation-concurrency.spec.ts` una compra y un recálculo concurrentes sobre el mismo jugador, coordinados por barrera o lock de test sin esperas arbitrarias, aceptando cualquiera de los dos órdenes de commit y verificando snapshot completo, operación, cotización activa final, una transferencia, saldos y tenencias.
- [X] T029 [P] [US3] Agregar escenarios de replay idempotente y payload conflictivo con aserciones de respuesta en `docs/postman/market-orders.postman_collection.json`.

### Implementación de User Story 3

- [X] T030 [US3] Implementar en `backend/src/orders/persistence/typeorm-orders.repository.ts` la persistencia del valor normalizado recibido, su restricción `UNIQUE`, el lock `pg_advisory_xact_lock` sobre esa clave y la carga de la orden existente; entregar el registro al dominio para que `OrdenCompra` decida replay o conflicto, sin normalizar, validar ni duplicar reglas en el repository; depende de T027.
- [X] T031 [US3] Implementar en `backend/src/orders/orders.service.ts` el retry de hasta tres intentos, limitado exclusivamente a `40001` y `40P01`, reabriendo la UoW y reutilizando la clave de idempotencia tras un timeout; depende de T030.
- [X] T032 [US3] Consolidar en `backend/src/orders/persistence/typeorm-orders.repository.ts` el orden fijo de locks para estrategia, jugador, cotización, usuarios, saldos, tokens y tenencias, con selección por emisión y actualizaciones agregadas consistentes; verificar que el lock compartido con recálculo produzca snapshots completos y nunca una mezcla parcial de estrategia, versión, `idRecalculo`, cotización e importe; depende de T028 y T031.

**Checkpoint**: los reintentos no duplican movimientos, las compras concurrentes no sobre-venden
tokens y el suministro total por jugador permanece en 100.

---

## Phase 6: Polish y verificaciones cruzadas

**Objetivo**: cerrar documentación, ejecución completa y trazabilidad sin ampliar el alcance.

- [X] T033 [P] Actualizar las descripciones y ejemplos finales de `docs/postman/market-orders.postman_collection.json` y `specs/011-market-buy/contracts/buy-order.md` para que coincidan con el response y errores implementados.
- [X] T034 [P] Revisar la documentación de `backend/test/unit/documentation/orders-openapi.spec.ts` contra `backend/src/orders/orders.controller.ts`, incluyendo seguridad Bearer, `Idempotency-Key` y los seis códigos HTTP.
- [X] T035 Ejecutar el flujo de `specs/011-market-buy/quickstart.md` desde `backend/`: build, unitarios de órdenes, integración Testcontainers, Supertest y OpenAPI; registrar cualquier fallo sin alterar tests existentes.
- [X] T036 Ejecutar la suite completa definida en `backend/package.json`, `git diff --check` y una revisión de cambios limitada a `backend/src/orders/`, `backend/migrations/1790275843000-CreateOrdenesCompra.ts`, nuevas suites/helpers, documentación Postman y `specs/011-market-buy/`.

---

## Dependencias y orden de ejecución

### Dependencias por fase

- **Setup**: T001–T002 no dependen de implementación; pueden ejecutarse en paralelo.
- **Foundational**: T003–T009 depende de Setup y bloquea todas las user stories.
- **US1**: T010–T020 depende de Foundational; entrega el MVP de compra válida.
- **US2**: T021–T026 depende de US1 porque extiende el endpoint y su mapeo de errores.
- **US3**: T027–T032 depende de US1/US2 para reutilizar la UoW y diferenciar replay de errores de negocio.
- **Polish**: T033–T036 depende de las historias que se quieran entregar.

### Dependencias dentro de la implementación

```text
T001-T002
  -> T003-T009
  -> T010-T020 (US1 / MVP)
  -> T021-T026 (US2)
  -> T027-T032 (US3)
  -> T033-T036
```

T003/T004/T009 pueden avanzar en paralelo con T005/T006 cuando solo se definan contratos y
artefactos separados. T010–T013 son pruebas iniciales independientes; T014–T015 también pueden
avanzar en paralelo. T023 y T029 usan archivos separados de implementación/documentación.

## Oportunidades de ejecución paralela

### Foundational

```text
T003: migración en backend/migrations/1790275843000-CreateOrdenesCompra.ts
T004: entidades en backend/src/orders/persistence/
T009: contrato del resolver en backend/test/unit/orders/quote-resolver.spec.ts
```

### User Story 1

```text
T010: dominio en backend/test/unit/orders/orden-compra.spec.ts
T011: service en backend/test/unit/orders/orders.service.spec.ts
T012: OpenAPI en backend/test/unit/documentation/orders-openapi.spec.ts
T013: integración en backend/test/integration/orders/buy-order.spec.ts
```

Después de esas pruebas, T014 y T015 pueden ejecutarse en paralelo; T020 puede avanzar en paralelo
con la estabilización de integración una vez que exista la ruta de T018.

### User Story 2

```text
T021: unitarios de errores en backend/test/unit/orders/orders.service.spec.ts
T022: HTTP de errores en backend/test/integration/orders/buy-order.spec.ts
T023: constraints en backend/test/integration/orders/schema-constraints.spec.ts
```

T021 y T022 comparten archivos con tareas anteriores, por lo que la paralelización es conceptual;
deben coordinarse para evitar conflictos de edición.

### User Story 3

```text
T027: idempotencia unitaria en backend/test/unit/orders/orders.service.spec.ts
T028: concurrencia en backend/test/integration/orders/buy-order.spec.ts
T029: replay en docs/postman/market-orders.postman_collection.json
```

T029 sí puede ejecutarse en paralelo con T027/T028; T030–T032 requieren integrar todos los
resultados de prueba.

## Estrategia de implementación

### MVP

1. Completar Setup y Foundational.
2. Implementar US1 y detenerse en su checkpoint.
3. Ejecutar compra parcial/total, verificar exactitud y revisar Swagger/Postman.

### Entrega incremental

1. US1 agrega compra válida.
2. US2 agrega rechazo y rollback verificables.
3. US3 agrega replay, serialización y concurrencia.
4. Polish ejecuta el quickstart y la suite completa.

No se generan tareas para venta, portfolio, ranking, historial de operaciones, frontend ni nuevos
mecanismos de autenticación.
