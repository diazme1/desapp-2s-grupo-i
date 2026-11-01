# Implementation Plan: Historial de operaciones de Mercado

**Branch**: `014-market-transactions` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-market-transactions/spec.md`

## Summary

Agregar una consulta autenticada del historial propio de compras y ventas en
`GET /users/:id/transactions`. El caso de uso reutiliza JWT, `OwnershipService`,
`transacciones_mercado` y los objetos `Cotizacion`/`Creditos`, proyectando únicamente los
campos públicos del contrato. El nombre completo se enriquece desde `jugadores.nombre_completo`
para el `id_jugador` persistido, sin usar el catálogo para obtener operaciones o snapshots. La
lectura se ejecuta con snapshot de solo lectura y ordena por `fecha_hora DESC, id_operacion ASC`;
no agrega persistencia ni modifica operaciones existentes.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 22, NestJS 11.

**Primary Dependencies**: TypeORM 0.3, `@nestjs/swagger`, `class-validator`, `JwtAuthGuard`,
`OwnershipService`, `Cotizacion` y `Creditos` existentes.

**Storage**: PostgreSQL, lectura de operaciones y snapshots del historial exclusivamente desde
`transacciones_mercado` dentro de una transacción `REPEATABLE READ` marcada como `READ ONLY`. Se
consulta `jugadores` únicamente para `nombre_completo` del `id_jugador` persistido. La tabla
`usuarios` solo puede consultarse para verificar la existencia del usuario autenticado y decidir el
`404`; no aporta operaciones ni snapshots. No se agregan tablas ni migraciones.

**Testing**: Jest 30, PostgreSQL/Testcontainers para persistencia y Supertest para HTTP.

**Target Platform**: Backend REST del proyecto Football Player Market.

**Project Type**: Web service REST modular en NestJS.

**Performance Goals**: No definidos por esta feature; el rendimiento queda fuera de alcance.

**Constraints**: Solo el usuario autenticado puede leer su historial; errores `401`, `403`,
`404`, `409` y `422` según el spec; SQL con filtro por comprador o vendedor y orden
`fecha_hora DESC, id_operacion ASC`; aritmética exacta sin punto flotante; excluir del contrato
claves de idempotencia, contrapartes, estrategia y metadatos internos; no recalcular cotizaciones.

**Scale/Scope**: Un endpoint y su módulo de lectura, con DTO/read model y documentación. Sin
filtros, paginación, exportación, escritura, portfolio ni cambios en órdenes existentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Stack**: mantiene TypeScript/NestJS y PostgreSQL.
- [x] **Capas**: Controller delega al Service; Service aplica ownership y mapea errores; Repository
  solo carga el read model y el nombre de catálogo; no se trasladan reglas de negocio al Repository.
- [x] **Validación**: `ParseUUIDPipe`/pipeline valida la forma; Service verifica existencia y
  ownership; el mapeo público valida invariantes del snapshot que sean necesarias para el
  contrato; no se agregan reglas de negocio al Repository.
- [x] **Solo lectura e inmutabilidad**: la consulta usa un snapshot `READ ONLY` sobre las tablas
  existentes y no toca transacciones, auditorías, saldos, tokens, tenencias ni cotizaciones.
- [x] **Tests**: unitarios sin NestJS/DB para proyección y mapeo; integración con PostgreSQL real
  en Testcontainers; HTTP con Supertest; tests existentes intactos.
- [x] **Definición de terminado**: planifica Swagger/OpenAPI, Postman, compilación y evidencia de
  tests, sin crear migraciones nuevas.
- [x] **Idioma y dominio**: documentación y errores en español; se reutilizan nombres de dominio
  existentes sin introducir identificadores con acentos o `ñ`.

**Gate status**: PASS. No hay violaciones que requieran Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/014-market-transactions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/transactions-history.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.module.ts                         # importa TransactionsModule
│   └── transactions/
│       ├── transactions.module.ts
│       ├── transactions.controller.ts        # GET /users/:id/transactions
│       ├── transactions.service.ts           # ownership, existencia y errores
│       ├── transactions.repository.ts        # interfaz del read model
│       ├── dto/transactions-response.dto.ts  # contrato y proyección pública
│       └── persistence/
│           └── typeorm-transactions.repository.ts
└── test/
    ├── unit/transactions/
    ├── unit/documentation/transactions-openapi.spec.ts
    └── integration/transactions/
        ├── transactions.spec.ts
        ├── transactions-errors.spec.ts
        └── transactions-read-only.spec.ts

docs/postman/football-player-market.postman_collection.json
```

**Structure Decision**: Se agrega un módulo de lectura `transactions` paralelo a `portfolio`,
reutilizando `AuthModule`, `PlayersModule`/`PLAYERS_DATA_SOURCE`, `OwnershipService`,
`TransaccionMercadoSnapshot`, `TipoTransaccionMercado`, `Cotizacion` y `Creditos`. No se crea una
entidad, dominio nuevo ni migración: la persistencia se consulta mediante la misma fuente y tabla
que usan las operaciones de Mercado. La respuesta pública se modela en DTOs propios porque el
mapper de órdenes expone datos internos que este endpoint debe excluir.

**Post-design Constitution Check**: PASS. El diseño conserva la separación de capas, la lectura
`READ ONLY`, la aritmética exacta, los tests requeridos, la documentación obligatoria y la
protección de tests existentes.

## Complexity Tracking

No aplica: el Constitution Check no presenta violaciones.
