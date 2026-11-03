# Implementation Plan: Fundamentos del mercado de jugadores

**Branch**: `010-market-foundation` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-market-foundation/spec.md`

## Summary

Extender el registro existente para crear el usuario y su saldo inicial de 1.000 créditos
en una única transacción, sin modificar el contrato HTTP ni el bootstrap del superusuario.
Agregar el fundamento persistente del Mercado con tokens individuales, tenencias agregadas y
una inicialización interna idempotente que emita exactamente 100 tokens por jugador.

La implementación reutilizará el catálogo y el historial de cotizaciones actuales. La
cotización inicial se representará como una apertura explícita dentro de
`historial_cotizacion`, con restricciones propias y sin estadísticas artificiales. La
inicialización de tokens, tenencias y apertura de cotización compartirá una transacción y
bloqueos de filas de jugadores; los propietarios existentes nunca se sobrescribirán.

## Technical Context

**Language/Version**: Node.js 22.11.x, TypeScript 5.7.3 con `strict` y CommonJS.

**Primary Dependencies**: NestJS 11, TypeORM 0.3.27, `pg`, `class-validator`,
`class-transformer`, Jest 30, Supertest y Testcontainers 11.5.1.

**Storage**: PostgreSQL. Las migraciones se ejecutan mediante TypeORM; los módulos Nest
actuales crean DataSources separados.

**Testing**: Jest. El dominio se prueba sin NestJS ni base de datos; los Services,
Repositories y `TypeOrmQuoteOpeningWriter` con persistencia se prueban contra PostgreSQL real
levantado con Testcontainers; los endpoints existentes se verifican con Supertest y el harness
HTTP de integración. Se agrega una prueba de resiliencia que deja indisponible el proveedor
externo y confirma que las lecturas locales de jugadores, tokens y cotizaciones persistidas no
dependen de él.

**Target Platform**: Backend REST ejecutado localmente y en CI con Node.js 22 y PostgreSQL.

**Project Type**: Backend web-service modular con NestJS.

**Constraints**: No agregar endpoints de compra, venta, portfolio o transacciones; no
modificar el contrato público de registro; no almacenar cotizaciones en tokens; usar valores
exactos; mantener `Controller -> Service -> Domain Model / Repository`; no modificar ni
eliminar tests existentes; preservar cotizaciones históricas y propietarios actuales.

**Scale/Scope**: Usuarios existentes y futuros, jugadores persistidos en el catálogo y hasta
100 tokens iniciales por jugador. La feature no crea transacciones financieras ni operaciones
de compra/venta.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*GATE: PASS before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento |
|---|---|
| I. Stack tecnológico | PASS: se mantienen TypeScript/NestJS, PostgreSQL y REST. |
| II. Arquitectura en capas | PASS: Controllers existentes delegan; los nuevos casos se separan en Services, modelos de dominio y Repositories. Los Repositories solo cargan y persisten modelos; no deciden reglas de negocio. |
| III. Modelo rico | PASS: saldo, token, tenencia y cotización protegen sus invariantes mediante métodos de dominio; TypeORM queda en persistencia. |
| IV. Cada validación en su nivel | PASS: DTOs actuales mantienen forma; Services resuelven existencia, estados y flujo; dominio valida cantidades e invariantes; PostgreSQL aplica FK, checks y unicidad como defensa. |
| V. Tests y protección | PASS: se agregan unitarios sin infraestructura e integración con PostgreSQL/Testcontainers; no se modifican assertions ni se eliminan tests existentes. Los helpers se actualizan solo para soportar el esquema nuevo. |
| VI. Definición de terminado | PASS: se incluyen build, lint, tests, migraciones y verificación del contrato OpenAPI existente; no hay endpoints nuevos de Mercado que documentar. |
| VII. Idioma | PASS: documentación y errores nuevos en español; identificadores sin acentos ni ñ. |
| VIII. Operaciones transaccionales | PASS: registro+saldo y emisión+tenencias+apertura se confirman o revierten como unidades atómicas. Compra/venta siguen fuera de alcance. |
| IX. Integraciones externas | PASS: la feature trabaja con datos locales; no agrega llamadas a proveedores externos. |
| Invariantes de producto | PASS: 100 tokens por jugador, `Creditos` y `Cotizacion` exactos, historial append-only y propietarios no sobrescritos. La apertura tiene una estrategia/versionado de bootstrap explícitos y reproducibles. |

No hay violaciones constitucionales que justificar. La excepción semántica de la cotización
de apertura respecto de `id_estadistica` se modela explícitamente en el historial, con un
tipo de estrategia, versión estable y restricciones que impiden mezclarla con cotizaciones
calculadas; no se usan UUIDs ni estadísticas inventadas.

**Re-evaluación después del diseño (Phase 1): PASS.** El modelo mantiene las capas,
transacciones atómicas, exactitud numérica mediante `Creditos` y `Cotizacion`, historial
append-only, suministro de 100 tokens y la protección de tests existentes. La nulabilidad de
las referencias de apertura queda acotada por checks de base de datos y por el contrato de
historial.

### Representación exacta de cotizaciones

El dominio utilizará el value object `Cotizacion`, basado en unidades mínimas enteras
`bigint` con escala fija de dos decimales: `1.00 = 100` unidades y `83.75 = 8375` unidades.
`Cotizacion` aceptará únicamente entradas decimales explícitas con hasta dos posiciones,
rechazará valores negativos, exponentes, más precisión que la soportada y valores fuera del
rango de `numeric(14,2)`, y ofrecerá operaciones de parseo, formateo, comparación y
conversión desde/hacia unidades.

PostgreSQL continuará almacenando `historial_cotizacion.cotizacion` como `numeric(14,2)`. El
transformer de persistencia convertirá el texto decimal que entrega `pg` a `Cotizacion` y
convertirá `Cotizacion` a su texto decimal canónico al escribir; no utilizará `Number(...)` ni
`number` como representación del dominio, de services o de contratos internos de escritura.
La apertura se construirá como `Cotizacion.fromUnidades(100)` y se persistirá como `1.00` en
PostgreSQL.

El endpoint existente `GET /players/:id/quotes` conservará su contrato HTTP actual. Si el
DTO continúa exponiendo `cotizacion` como número JSON, la conversión se realizará únicamente
en el DTO como presentación, a partir del formato decimal canónico, y ese valor no volverá al
dominio ni se utilizará para cálculos financieros. Los valores históricos y futuros utilizados
por operaciones internas conservarán el recorrido exacto PostgreSQL `numeric(14,2)` ↔
`Cotizacion` ↔ formato decimal canónico, sin pérdida.

## Project Structure

### Documentation (this feature)

```text
specs/010-market-foundation/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── validation.md        # evidencia de cierre de la feature
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/
│   │   ├── auth.service.ts                 # registro existente; saldo inicial por opción interna
│   │   └── superadmin-bootstrap.service.ts  # ensure reutilizable; sin nuevo bootstrap
│   ├── users/
│   │   ├── domain/
│   │   │   ├── user.ts
│   │   │   └── saldo-usuario.ts
│   │   ├── persistence/
│   │   │   ├── user.entity.ts
│   │   │   ├── saldo-usuario.entity.ts
│   │   │   └── typeorm-user.repository.ts   # usuario + saldo en una transacción
│   │   └── users.repository.ts
│   ├── market/
│   │   ├── domain/
│   │   │   ├── creditos.ts
│   │   │   ├── cotizacion.ts
│   │   │   ├── token-jugador.ts
│   │   │   └── tenencia-jugador.ts
│   │   ├── persistence/
│   │   │   ├── token-jugador.entity.ts
│   │   │   ├── tenencia-jugador.entity.ts
│   │   │   └── typeorm-market.repository.ts
│   │   ├── market.repository.ts
│   │   ├── market-initialization.service.ts
│   │   └── market.module.ts
│   ├── players/
│   │   ├── persistence/historial-cotizacion.entity.ts  # apertura explícita
│   │   ├── persistence/typeorm-players.repository.ts    # lectura existente preservada
│   │   └── persistence/typeorm-quote-opening-writer.ts  # escritura interna de apertura
│   ├── quotes/
│   │   ├── quotes.repository.ts             # contrato de lectura exclusivo
│   │   ├── quote-opening-writer.ts          # contrato interno de escritura
│   │   └── historial-cotizacion.service.ts  # consulta existente sin nuevo endpoint
│   └── database/data-source.ts
├── migrations/
│   ├── 1790275839000-ExtendHistorialCotizacionForMarketOpening.ts
│   ├── 1790275840000-CreateSaldosUsuario.ts
│   ├── 1790275841000-CreateTokens.ts
│   └── 1790275842000-CreateTenenciasJugador.ts
└── test/
    ├── unit/auth/
    ├── unit/users/
    ├── unit/market/
    ├── unit/players/
    └── integration/market/
```

**Structure Decision**: Se conserva el backend modular existente. `users` es dueño de la
identidad y del saldo inicial transaccional; `market` es dueño de tokens, tenencias y de la
orquestación de emisión; `players` y `quotes` siguen siendo dueños del catálogo y del
historial de cotizaciones. `quotes.repository.ts` mantiene exclusivamente el contrato de
lectura. La escritura de la apertura se abstrae mediante `QuoteOpeningWriter` y se implementa
en `TypeOrmQuoteOpeningWriter`, sin crear otra tabla de cotizaciones ni transacciones
financieras.

La conexión Nest actual de usuarios se amplía con `SaldoUsuarioEntity`. Para emisión y
cotización se expone un DataSource de jugadores compartido entre `TypeOrmPlayersRepository`,
`TypeOrmMarketRepository` y `TypeOrmQuoteOpeningWriter`, evitando una transacción distribuida
y sin refactorizar todo el proyecto a un `DatabaseModule` global. `PlayersModule` registra y
exporta el provider de `QuoteOpeningWriter`; `MarketModule` lo consume junto con el repository
de Mercado dentro de la misma unidad transaccional. La migración CLI y todos los helpers de
integración reciben las nuevas entidades y migraciones en el mismo orden.

El contrato `QuoteOpeningWriter`, ubicado en `backend/src/quotes/quote-opening-writer.ts`,
recibe una apertura ya validada con `Cotizacion` y un contexto transaccional abstracto. Su
implementación TypeORM, ubicada en
`backend/src/players/persistence/typeorm-quote-opening-writer.ts`, transforma el value object
a `numeric(14,2)` textual y persiste la fila append-only. No consulta ni escribe mediante
`backend/src/quotes/quotes.repository.ts`, que permanece dedicado a la lectura.

### Matriz de responsabilidades

| Capa | Responsabilidades en esta feature | Límites explícitos |
|---|---|---|
| Modelos de dominio | `Creditos`, `Cotizacion`, `SaldoUsuario`, `TokenJugador` y `TenenciaJugador` protegen sus invariantes mediante métodos de dominio: exactitud y no negatividad, escala decimal, rango de emisión, propietario único, cantidades válidas y relaciones lógicas. | No conocen NestJS, TypeORM, PostgreSQL, repositories ni HTTP. |
| Services y casos de uso | `AuthService` coordina el registro; `MarketInitializationService` valida la existencia de usuario, jugador y superusuario, decide si una emisión es nueva, completa o inconsistente, invoca métodos de dominio y coordina tokens, tenencias, apertura, idempotencia, concurrencia, rollback y reintentos. | No modifican directamente campos persistidos ni reemplazan las invariantes de los modelos. |
| Repositories | Exponen primitivas de persistencia: búsqueda, conteo, mapeo, locks, inserciones, actualizaciones y ejecución transaccional sobre los modelos o comandos ya decididos por los Services. | No deciden si emitir, crear una tenencia, aceptar un estado parcial, conservar un propietario ni si una emisión es válida. |
| PostgreSQL | Aplica FK, unicidad, rangos, checks y restricciones de eliminación como última defensa de integridad. | No reemplaza las validaciones del dominio ni las decisiones del caso de uso. |

La atomicidad se conserva haciendo que el Service coordine una unidad de trabajo de
repository: el repository puede abrir o ejecutar la transacción y aplicar los locks, pero
recibe las decisiones y operaciones ya validadas por el dominio y el caso de uso. Ante un
error del Service, del dominio o de la persistencia, la unidad completa se revierte.

## Complexity Tracking

No hay violaciones constitucionales que justificar. La separación de `market` y el DataSource
compartido del contexto de jugadores son límites del diseño existente, no proyectos nuevos.
