---

description: "Tareas de implementación para los fundamentos del mercado de jugadores"
---

# Tasks: Fundamentos del mercado de jugadores

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`,
`validation.md` y `contracts/quote-history-market-opening.md` de
`specs/010-market-foundation/`.

**Prerrequisitos**: la Constitución del proyecto, `plan.md` y `spec.md` son obligatorios;
los demás documentos de diseño se usan como fuente de detalle.

**Regla de protección de tests**: las tareas solo agregan tests nuevos o adaptan helpers de
infraestructura. No se modifican ni eliminan assertions, casos ni expectativas de tests
existentes sin autorización explícita.

## Phase 1: Setup (inspección y compatibilidad)

**Propósito**: confirmar las superficies existentes que se reutilizarán antes de crear el
modelo del Mercado.

- [X] T001 [P] Documentar el inventario de `AuthService.register`, repositorios de usuarios, bootstrap del superusuario, catálogo y lectura de cotizaciones en `backend/src/auth/auth.service.ts`, `backend/src/auth/superadmin-bootstrap.service.ts`, `backend/src/users/users.repository.ts`, `backend/src/players/players.repository.ts` y `backend/src/quotes/quotes.repository.ts`, contrastándolo con `specs/010-market-foundation/plan.md`.
- [X] T002 [P] Verificar las entidades, migraciones, DataSources y orden de inicialización actuales en `backend/src/database/data-source.ts`, `backend/src/users/users.module.ts`, `backend/src/players/players.module.ts`, `backend/test/integration/support/postgres.ts` y `backend/test/integration/helpers/integration-app.ts` antes de agregar nuevas dependencias.
- [X] T003 [P] Ejecutar y registrar la línea base de compilación, lint, tests unitarios e integración con los scripts de `backend/package.json`, sin alterar archivos de tests, para detectar regresiones posteriores.
- [X] T004 [P] Confirmar la compatibilidad del contrato actual de `POST /auth/register` y `GET /players/{id}/quotes` en `backend/src/auth/auth.controller.ts`, `backend/src/players/players.controller.ts`, `backend/test/integration/auth/register.spec.ts`, `backend/test/integration/players/quote-history.spec.ts` y `specs/010-market-foundation/contracts/quote-history-market-opening.md`.

---

## Phase 2: Foundational (modelo, esquema y límites transaccionales)

**Propósito**: implementar la base compartida que bloquea el trabajo de las user stories.

**CRÍTICO**: ninguna user story comienza hasta completar el modelo, las migraciones, el
registro de entidades y los helpers de PostgreSQL.

- [X] T005 [P] Implementar los value objects `Creditos` y `Cotizacion` basados en unidades mínimas `bigint` con escala fija de dos decimales; `Cotizacion` debe soportar `fromUnidades`, parseo decimal explícito, formateo canónico, comparación, rechazo de negativos/exponentes/más de dos decimales y límites de `numeric(14,2)`, en `backend/src/market/domain/creditos.ts` y `backend/src/market/domain/cotizacion.ts`.
- [X] T006 [P] Implementar el modelo rico `SaldoUsuario` y su entidad TypeORM con una fila por usuario, saldo no negativo, timestamps y relación `ON DELETE RESTRICT`, en `backend/src/users/domain/saldo-usuario.ts` y `backend/src/users/persistence/saldo-usuario.entity.ts`.
- [X] T007 [P] Implementar el modelo rico `TokenJugador` y su entidad TypeORM con `id_token`, jugador, propietario actual, `numero_emision` 1..100, lote, timestamps y sin campos de cotización, en `backend/src/market/domain/token-jugador.ts` y `backend/src/market/persistence/token-jugador.entity.ts`.
- [X] T008 [P] Implementar el modelo rico `TenenciaJugador` y su entidad TypeORM con cantidad entera, relación usuario-jugador única, timestamps y validación de invariantes, en `backend/src/market/domain/tenencia-jugador.ts` y `backend/src/market/persistence/tenencia-jugador.entity.ts`.
- [X] T009 Preparar la persistencia de la apertura sin tocar el contrato de lectura: adaptar `HistorialCotizacionEntity` para `Cotizacion` y el transformer exacto `numeric(14,2)` textual que utilizará el writer; la nulabilidad y los checks de esquema quedan en la migración siguiente, sin modificar DTOs, mappers ni `quotes.repository.ts`, en `backend/src/players/persistence/historial-cotizacion.entity.ts` (depende de T004-T005).
- [X] T010 Crear la migración que habilita la apertura `apertura_mercado`, sus checks de valor y procedencia, nulabilidad controlada e índice único parcial por jugador, en `backend/migrations/1790275839000-ExtendHistorialCotizacionForMarketOpening.ts` (depende de T009).
- [X] T011 Crear la migración de `saldos_usuario` con PK/FK a `usuarios`, `creditos_disponibles bigint` no negativo y backfill en cero para usuarios existentes, en `backend/migrations/1790275840000-CreateSaldosUsuario.ts` (depende de T006).
- [X] T012 Crear la migración de `tokens` con PK `id_token`, FKs a `jugadores` y `usuarios`, unicidad `(id_jugador, numero_emision)`, rango 1..100 y restricciones de eliminación, en `backend/migrations/1790275841000-CreateTokens.ts` (depende de T007 y T011).
- [X] T013 Crear la migración de `tenencias_jugador` con PK, FKs, unicidad `(id_usuario, id_jugador)`, rango de cantidad y timestamps, en `backend/migrations/1790275842000-CreateTenenciasJugador.ts` (depende de T008 y T012).
- [X] T014 Registrar las nuevas entidades y migraciones en el DataSource CLI y en los módulos Nest existentes, preservando la configuración de PostgreSQL y sin crear un DataSource global nuevo, en `backend/src/database/data-source.ts`, `backend/src/users/users.module.ts` y `backend/src/players/players.module.ts` (depende de T010-T013).
- [X] T015 Definir `QuoteOpeningWriter` como contrato interno de escritura que recibe una apertura validada con `Cotizacion` y un contexto transaccional abstracto; mantener `quotes.repository.ts` como contrato de lectura exclusivo y definir las primitivas transaccionales de saldo, tokens y tenencias sin trasladar decisiones de negocio a repositories, en `backend/src/quotes/quote-opening-writer.ts`, `backend/src/quotes/quotes.repository.ts`, `backend/src/users/users.repository.ts`, `backend/src/market/market.repository.ts` y `backend/src/market/persistence/typeorm-market.repository.ts` (depende de T005-T008).
- [X] T016 Actualizar únicamente la infraestructura de integración para cargar entidades y migraciones nuevas y limpiar tablas en orden inverso de FK, sin cambiar assertions existentes, en `backend/test/integration/support/postgres.ts`, `backend/test/integration/helpers/integration-app.ts` y `backend/test/integration/players/players-integration-app.ts` (depende de T010-T014).
- [X] T017 [P] Agregar pruebas de esquema y persistencia PostgreSQL/Testcontainers para FK, checks de rango, unicidad de tokens, unicidad de tenencias, saldo único, nulabilidad controlada de aperturas y round-trip exacto de cotizaciones `numeric(14,2)` ↔ `Cotizacion`, en `backend/test/integration/market/schema-constraints.spec.ts` y `backend/test/integration/market/quote-precision.spec.ts` (depende de T009-T016).

**Checkpoint**: el esquema puede migrarse y revertirse, las entidades están registradas y los
helpers de integración respetan las nuevas claves foráneas sin tocar los tests existentes.

---

## Phase 3: User Story 1 - Registrar una cuenta con saldo inicial (Priority: P1) 🎯 MVP

**Objetivo**: conservar el contrato público de registro y crear usuario más saldo inicial de
1.000,00 créditos en una única operación atómica.

**Prueba independiente**: un registro nuevo devuelve el mismo contrato HTTP, persiste una
única cuenta con `100.000` unidades mínimas y deja cero cambios ante duplicado, error o
rollback.

### Tests para User Story 1

> Escribir estos tests antes de la implementación y comprobar que fallan por la funcionalidad
> ausente. Los tests existentes no se editan.

- [X] T018 [P] [US1] Agregar tests unitarios de `Creditos`, `SaldoUsuario` y del flujo interno de registro para saldo inicial, duplicados y errores de dominio, en `backend/test/unit/market/creditos.spec.ts`, `backend/test/unit/users/saldo-usuario.spec.ts` y `backend/test/unit/auth/register-balance.spec.ts` (depende de T005-T006).
- [X] T019 [P] [US1] Agregar tests HTTP de integración con PostgreSQL/Testcontainers usando Supertest y el harness existente, separados de los tests unitarios de `AuthService` y de los tests de repository, para registro, correo normalizado, saldo único y concurrencia, en `backend/test/integration/auth/register-balance.spec.ts` y `backend/test/integration/helpers/integration-app.ts` (depende de T016-T017). El rollback unitario de persistencia queda cubierto separadamente en T021.

### Implementación de User Story 1

- [X] T020 [US1] Extender el puerto de usuarios y `AuthService.register` con una opción interna de saldo inicial, manteniendo el contrato público, la normalización del correo, el rol `usuario` y los códigos HTTP actuales, en `backend/src/users/users.repository.ts` y `backend/src/auth/auth.service.ts` (depende de T018-T019).
- [X] T021 [US1] Implementar en `TypeOrmUserRepository` la transacción atómica que persiste usuario y `SaldoUsuario` con `100.000` unidades, delega invariantes al dominio y deja a PostgreSQL resolver la unicidad de correo; cubrir su rollback unitario sin mezclarlo con el test HTTP, en `backend/src/users/persistence/typeorm-user.repository.ts`, `backend/src/users/persistence/saldo-usuario.entity.ts` y `backend/test/unit/users/typeorm-user.repository.spec.ts` (depende de T020).
- [X] T022 [US1] Incorporar `SaldoUsuarioEntity` al DataSource de usuarios y conservar constructores/proveedores compatibles con los tests actuales, en `backend/src/users/users.module.ts` y `backend/src/database/data-source.ts` (depende de T021).
- [X] T023 [US1] Verificar que `SuperadminBootstrapService` siga creando o reutilizando únicamente el superusuario configurado y no reciba el saldo inicial del registro, sin reimplementar bootstrap ni roles, en `backend/src/auth/superadmin-bootstrap.service.ts`, `backend/src/auth/auth.module.ts` y `backend/test/unit/auth/superadmin-bootstrap-market-balance.spec.ts` (depende de T021-T022; el test de regresión es nuevo y no modifica `backend/test/unit/auth/superadmin-bootstrap.spec.ts`).

**Checkpoint**: US1 queda completa cuando el registro existente conserva su contrato, cada
nuevo usuario tiene exactamente un saldo inicial y los casos de duplicado/concurrencia/error
no dejan filas parciales.

---

## Phase 4: User Story 2 - Inicializar el suministro de tokens (Priority: P1)

**Objetivo**: emitir internamente 100 tokens individuales por jugador, crear la tenencia
agregada del superusuario y registrar una apertura de 1,00 crédito, de manera idempotente,
concurrente y no destructiva.

**Prueba independiente**: con catálogo y superusuario existentes, la primera ejecución deja
exactamente los tokens 1..100, una tenencia de 100 y una apertura; las reejecuciones, workers
concurrentes y jugadores nuevos no duplican ni transfieren propietarios.

### Tests para User Story 2

> Escribir estos tests antes de la implementación y comprobar que fallan por la funcionalidad
> ausente. No modificar los escenarios ni assertions de integración existentes.

- [X] T024 [P] [US2] Agregar tests unitarios de `Cotizacion`, `QuoteOpeningWriter` y de las invariantes de token, tenencia y estados de inicialización (cero, completa, parcial e inconsistente); cubrir parseo, formateo, comparación, valores inválidos, límites de precisión, `1.00 = 100` unidades y la implementación TypeORM con un contexto transaccional simulado, en `backend/test/unit/market/cotizacion.spec.ts`, `backend/test/unit/quotes/quote-opening-writer.contract.spec.ts`, `backend/test/unit/players/typeorm-quote-opening-writer.spec.ts`, `backend/test/unit/market/token-jugador.spec.ts`, `backend/test/unit/market/tenencia-jugador.spec.ts` y `backend/test/unit/market/market-initialization.service.spec.ts` (depende de T005-T009 y T015).
- [X] T025 [P] [US2] Agregar la suite de integración base con PostgreSQL/Testcontainers para emisión exacta, propietario superusuario, tenencia agregada, apertura única y reejecución idempotente; cubrir el `Independent Test` de la User Story 2 y el edge case de catálogo vacío del `spec.md`, verificando finalización correcta sin tokens, tenencias, apertura ni datos parciales, en `backend/test/integration/market/market-initialization.spec.ts` (depende de T016-T017).

### Implementación de User Story 2

- [X] T026 [US2] Exponer una operación interna idempotente para asegurar el superusuario configurado, reutilizando `SuperadminBootstrapService`, y hacer explícito el error cuando la configuración no coincide con un usuario `superadmin`, en `backend/src/auth/superadmin-bootstrap.service.ts` y `backend/src/auth/auth.module.ts` (depende de T024-T025).
- [X] T027 [US2] Implementar `TypeOrmMarketRepository` como adaptador de persistencia del contexto compartido de jugadores: consultas de jugadores, conteos y lecturas de tokens/tenencias, locks `FOR UPDATE` en orden determinista, mapeo, inserciones, actualizaciones y persistencia transaccional de los comandos recibidos, sin decidir si emitir, crear tenencias, aceptar estados parciales ni conservar propietarios, en `backend/src/market/persistence/typeorm-market.repository.ts` y `backend/src/market/market.repository.ts` (depende de T014-T015 y T026).
- [X] T028 [US2] Implementar `MarketInitializationService` como caso de uso interno que valida la existencia del superusuario y de cada jugador, decide si la emisión es nueva, completa o inconsistente, invoca los métodos de dominio para construir tokens y tenencias, procesa jugadores posteriores, revierte emisiones parciales y reintenta de forma acotada `40001`/`40P01`, en `backend/src/market/market-initialization.service.ts`, `backend/src/market/domain/token-jugador.ts` y `backend/src/market/domain/tenencia-jugador.ts` (depende de T024-T027).
- [X] T029 [US2] Implementar `TypeOrmQuoteOpeningWriter` y conectar `MarketInitializationService` al contrato `QuoteOpeningWriter`: el Service construye `Cotizacion.fromUnidades(100)`, equivalente a `1.00`, y valida la estrategia, versión estable y procedencia nula permitida; el writer transforma el value object a `numeric(14,2)` textual e inserta la apertura append-only dentro de la transacción, sin escribir mediante `quotes.repository.ts` ni usar `number` en dominio o escritura, en `backend/src/quotes/quote-opening-writer.ts`, `backend/src/players/persistence/typeorm-quote-opening-writer.ts` y `backend/src/market/market-initialization.service.ts` (depende de T009-T010, T015 y T027-T028).
- [X] T030 [US2] Registrar y exportar el provider `QuoteOpeningWriter` desde `PlayersModule`, inyectarlo en `MarketModule` y completar la integración de `MarketModule` con el lifecycle/bootstrap existente y el DataSource compartido del contexto de jugadores, sin endpoint público nuevo ni DataSource global, en `backend/src/players/players.module.ts`, `backend/src/market/market.module.ts`, `backend/src/app.module.ts` y `backend/src/auth/superadmin-bootstrap.service.ts` (depende de T026-T029).
- [X] T031 [US2] Completar los escenarios de integración de concurrencia, emisión parcial, estado inconsistente, jugador agregado después de la primera corrida y propietario previamente modificado, en `backend/test/integration/market/market-initialization.spec.ts` (depende de T030; agregar casos sin alterar suites existentes).

**Checkpoint**: US2 queda completa cuando la inicialización es atómica por jugador, resiste
reintentos/concurrencia, conserva propietarios existentes y registra una sola apertura válida
por jugador.

---

## Phase 5: User Story 3 - Saldos y tenencias consistentes (Priority: P2)

**Objetivo**: dejar explícitas las relaciones de saldo y tenencia, garantizar que la tenencia
agregada coincida con los tokens actuales y mantener separadas identidad, cotización y futuras
transacciones.

**Prueba independiente**: la suma de tenencias por jugador coincide con el conteo de
propietarios en `tokens`, el historial conserva cotizaciones calculadas y de apertura sin
referencias falsas, y no existe tabla ni endpoint de transacciones financieras.

### Tests para User Story 3

- [X] T032 [P] [US3] Agregar tests unitarios de consistencia de tenencias, cantidades exactas y ausencia de precio/cotización en `TokenJugador`, en `backend/test/unit/market/market-consistency.spec.ts` y `backend/test/unit/market/token-jugador.spec.ts` (depende de T007-T008, T023 y T031; se ejecuta en paralelo con T033 y T034 una vez completadas US1 y US2).
- [X] T033 [P] [US3] Agregar tests de compatibilidad del contrato OpenAPI y de la conversión exclusiva del DTO desde el formato decimal canónico al número JSON existente, incluyendo aperturas con `null` en procedencias y cotizaciones calculadas sin cambios, en `backend/test/unit/documentation/market-opening-openapi.spec.ts` (depende de T009, T023 y T031; se ejecuta en paralelo con T032 y T034 una vez completadas US1 y US2).
- [X] T034 [P] [US3] Agregar tests de integración de reconciliación token-tenencia, FKs restrictivas, apertura append-only y ausencia de tabla de transacciones, en `backend/test/integration/market/market-consistency.spec.ts` (depende de T023 y T030-T031; se ejecuta en paralelo con T032 y T033 una vez completadas US1 y US2).

### Implementación de User Story 3

- [X] T035 [US3] Implementar en `MarketInitializationService` la validación/reconciliación que obtiene del repository los conteos y propietarios actuales, compara `tokens.id_usuario_owner` con `tenencias_jugador.cantidad_tokens`, decide si el estado es consistente, falla ante inconsistencias y no modifica propietarios automáticamente; el repository queda limitado a exponer esas consultas, en `backend/src/market/market-initialization.service.ts` y `backend/src/market/market.repository.ts` (depende de T027-T031).
- [X] T036 [US3] Actualizar únicamente la lectura y presentación del historial: mapear `Cotizacion` al DTO, convertir al número JSON solo en el DTO, marcar `idRecalculo` e `idEstadistica` como nullable únicamente para aperturas y actualizar el contrato OpenAPI, preservando ruta, paginación, orden y respuesta de cotizaciones calculadas, en `backend/src/quotes/quotes.repository.ts`, `backend/src/quotes/dto/historial-cotizacion-response.dto.ts`, `backend/src/players/persistence/typeorm-players.repository.ts` y `backend/src/players/players.controller.ts` (depende de T009 y T033; no modifica entidades ni writer).
- [X] T037 [US3] Actualizar el ejemplo de compatibilidad de historial en `docs/postman/players-catalog.postman_collection.json` para aceptar la apertura sin agregar endpoints de saldo, tenencias, compra, venta, portfolio o transacciones (depende de T036).
- [X] T038 [US3] Auditar que `tokens` no tenga columnas de cotización, que la valuación siga proviniendo de `historial_cotizacion` y que no se cree una tabla de transacciones financieras reales, en `backend/src/market/persistence/token-jugador.entity.ts`, `backend/src/market/persistence/tenencia-jugador.entity.ts`, `backend/src/app.module.ts` y `specs/010-market-foundation/data-model.md` (depende de T035-T037).

**Checkpoint**: US3 queda completa cuando las invariantes de consistencia se verifican en
dominio y PostgreSQL, el contrato de historial sigue siendo compatible y las futuras
transacciones permanecen documentadas pero fuera del esquema implementado.

---

## Phase 6: Polish y verificación cruzada

**Propósito**: cerrar migraciones, rollback, documentación operativa y evidencia de calidad
sin ampliar el alcance funcional.

- [X] T039 [P] Agregar pruebas de `up`/`down` de las cuatro migraciones nuevas, incluyendo orden de dependencias y restauración del esquema anterior, en `backend/test/integration/market/migrations-rollback.spec.ts` y `backend/migrations/1790275839000-ExtendHistorialCotizacionForMarketOpening.ts` a `backend/migrations/1790275842000-CreateTenenciasJugador.ts` (depende de T010-T013; puede ejecutarse anticipadamente porque solo valida DDL y rollback, sin requerir la implementación de US1-US3).
- [X] T040 Revisar y limpiar los helpers de Testcontainers para aislar bases por suite, truncar tablas hijas antes de padres y cerrar DataSources sin fugas, manteniendo intactas todas las assertions existentes, en `backend/test/integration/helpers/integration-app.ts`, `backend/test/integration/players/players-integration-app.ts` y `backend/test/integration/support/postgres.ts` (depende de T016-T039).
- [X] T041 [P] Agregar una prueba de integración de resiliencia local que deshabilite o simule indisponible el proveedor externo y verifique que las lecturas de jugadores, tokens y cotizaciones ya persistidas continúan funcionando, sin modificar tests existentes, en `backend/test/integration/players/local-resilience.spec.ts` (depende de T038; puede ejecutarse en paralelo con T039 porque T039 solo valida migraciones y ambos cubren superficies independientes).
- [X] T042 Actualizar la guía operativa con comandos, consultas de verificación, casos de concurrencia, rollback, precisión y resiliencia local, en `specs/010-market-foundation/quickstart.md` (depende de T031 y T039-T041).
- [X] T043 Revisar trazabilidad entre requisitos, decisiones y tareas, confirmando que no aparezcan tareas de compra, venta, portfolio, historial de operaciones, financiamiento de recompras, creación del superusuario ni endpoints públicos nuevos, en `specs/010-market-foundation/spec.md`, `specs/010-market-foundation/plan.md`, `specs/010-market-foundation/research.md` y `specs/010-market-foundation/tasks.md` (depende de T038-T042).
- [X] T044 Ejecutar la validación final de build, lint, migraciones, tests unitarios, tests de integración con PostgreSQL/Testcontainers y verificaciones del quickstart; registrar comandos, resultados, incidencias y evidencia en `specs/010-market-foundation/validation.md`, separado del código fuente y de los tests (depende de T039-T043).

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Setup (Phase 1)**: no depende de otras fases.
- **Foundational (Phase 2)**: depende de Setup y bloquea todas las user stories.
- **US1 y US2**: ambas dependen de Foundational y pueden implementarse en paralelo una vez que el esquema y los helpers estén listos.
- **US3**: depende de US1 y US2 porque verifica el saldo registrado, la emisión, las tenencias y la compatibilidad de cotizaciones.
- **Polish (Phase 6)**: T039 puede ejecutarse anticipadamente después de las migraciones por validar únicamente DDL y rollback; T040-T044 esperan el cierre de las user stories y la evidencia que producen sus pruebas.

### Dependencias dentro de las user stories

- Los tests de cada story se escriben primero y deben fallar antes de implementar la funcionalidad.
- Los modelos y value objects preceden a repositorios y services.
- Las migraciones preceden al uso de las entidades en integración.
- Los Services definen y coordinan los límites del caso de uso; los repositories solo exponen la primitiva transaccional y ejecutan la persistencia solicitada.
- El bootstrap/lifecycle se integra después de que la inicialización interna sea testeable.
- La documentación y la validación final se ejecutan después de resolver los casos borde.

### Oportunidades de paralelización

- T001-T004 pueden ejecutarse en paralelo porque solo inspeccionan superficies distintas.
- T005-T008 pueden ejecutarse en paralelo porque corresponden a modelos independientes.
- T018 y T019 pueden ejecutarse en paralelo; cada uno agrega una suite nueva y ambos preceden a T020.
- T024 y T025 pueden ejecutarse en paralelo; cubren dominio y persistencia respectivamente.
- T032-T034 pueden ejecutarse en paralelo después de T023 y T031; cada suite cubre una superficie independiente de US3.
- T039 puede ejecutarse después de T010-T013 y en paralelo con T041; T041 espera a T038, T040 espera a T039 y T042 espera a T040 y T041.

## Ejemplo de ejecución paralela: User Story 1

```text
T018: unit tests de Creditos, SaldoUsuario y registro
T019: integración PostgreSQL de registro, concurrencia y rollback
T020-T022: implementación de AuthService, repositorio y módulo de usuarios
T023: regresión del bootstrap existente sin saldo inicial
```

## Estrategia de implementación

### MVP incremental

1. Completar Phase 1 y Phase 2 para dejar migraciones, entidades y helpers utilizables.
2. Completar US1 como primer incremento demostrable: registro existente más saldo inicial.
3. Validar US1 de forma independiente antes de continuar.
4. Completar US2 para habilitar el suministro inicial del Mercado.
5. Completar US3 para cerrar consistencia y compatibilidad del historial.
6. Ejecutar Phase 6 y conservar la evidencia de build, lint, tests, migraciones y rollback.

### Estrategia con varios desarrolladores

1. Una persona completa Phase 1 y las tareas de esquema de Phase 2.
2. Con Foundational lista, una persona puede tomar US1 y otra US2; no deben editar simultáneamente los mismos helpers sin coordinación.
3. US3 comienza cuando estén disponibles los contratos del repositorio de Mercado y la apertura de cotización.
4. La verificación final se hace sobre una rama integrada y con PostgreSQL/Testcontainers.

## Límites explícitos

- No se crean endpoints públicos nuevos.
- No se implementan compra, venta, portfolio ni consulta del historial de operaciones.
- No se crea una tabla `transacciones` en esta feature; solo se dejan FKs, claves de idempotencia y append-only como decisiones futuras documentadas.
- No se crea ni se reimplementa el superusuario, el rol `superadmin` ni el bootstrap existente.
- No se modifica ni elimina ningún test existente; los cambios se limitan a nuevos tests y a helpers de infraestructura/limpieza autorizados por el requerimiento.
