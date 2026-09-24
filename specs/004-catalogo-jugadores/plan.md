# Implementation Plan: Catálogo base de jugadores

**Branch**: `004-catalogo-jugadores` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-catalogo-jugadores/spec.md`

**Status**: Plan completo; listo para trazabilidad de tareas y revisión SDD.

## Summary

Crear el módulo `players` del backend para administrar el catálogo base de las cinco
competencias del producto. El módulo separa dominio, persistencia, servicios, DTOs y
adapter externo. `POST /catalog/refresh?ligaCodigo=PL` obtiene una liga, sus equipos y
plantillas desde Football-Data.org, respeta el ritmo de solicitudes configurado, valida y
persiste el conjunto en una transacción; `GET /players` y
`GET /players/:id` leen únicamente PostgreSQL. WhoScored, estadísticas, enriquecimiento,
valuaciones y portfolio quedan explícitamente fuera de esta entrega.

## Technical Context

**Language/Version**: TypeScript estricto sobre Node.js 22.11.x; CommonJS emitido por Nest.

**Primary Dependencies**: NestJS 11, `@nestjs/config`, `@nestjs/swagger`, TypeORM 0.3,
`pg`, `class-validator`, `class-transformer`, Jest 30, Supertest y Testcontainers.

**Storage**: PostgreSQL 16 mediante TypeORM y migraciones versionadas. Los identificadores
internos son UUID; los identificadores del proveedor son enteros únicos.

**Testing**: Unitarios sin Nest ni base para dominio, adapter y services; integración HTTP
con Supertest y persistencia contra PostgreSQL real levantado con Testcontainers. No se
modifican ni eliminan tests existentes.

**Target Platform**: Backend REST ejecutado localmente en Windows/PowerShell o en Docker
Compose, con Swagger en `/docs` y PostgreSQL expuesto en `localhost:5433`.

**Project Type**: Servicio web REST dentro del monorepo, en `backend/`.

**Performance Goals**: `GET /players` y `GET /players/:id` no deben depender de la red
externa; la carga del catálogo es una operación administrativa de baja frecuencia y debe
procesar el conjunto recibido de forma transaccional.

**Constraints**: Las lecturas deben funcionar con el proveedor caído; el token externo se
configura por entorno; los mensajes propios están en español; no se incorporan estadísticas
ni lógica financiera; el refresh requiere Bearer JWT y no agrega roles administrativos.

**Scale/Scope**: Cinco ligas, sus equipos y plantillas vigentes; un jugador pertenece a un
equipo en el catálogo vigente. La primera etapa no incluye paginación, estadísticas,
WhoScored, valuación, compras ni portfolio.

## Constitution Check

**Pre-Phase 0: PASS.** La propuesta usa TypeScript/NestJS/PostgreSQL, conserva el flujo
`Controller -> Service -> Domain/Repository`, encapsula Football-Data.org en un Adapter,
mantiene validaciones por nivel y respeta la protección de tests existentes.

| Principio | Cumplimiento previsto |
|---|---|
| I. Stack tecnológico | NestJS/TypeScript, PostgreSQL y REST existentes. |
| II. Arquitectura en capas | `PlayersController` delega; services orquestan; dominio no conoce infraestructura; repository y adapter aíslan detalles. |
| III. Modelo rico | `Liga`, `Equipo` y `Jugador` validan sus invariantes al crearse; no se exponen setters HTTP. |
| IV. Validaciones | DTOs validan entrada; services validan existencia; dominio valida identidad, nombres y fechas. |
| V. Tests | Unitarios aislados y tests de integración HTTP/persistencia sobre PostgreSQL real. |
| VI. Terminado | Swagger, Postman, README, migración, build, lint y tests forman parte de la entrega. |
| VII. Idioma | Documentación y errores propios en español; identificadores sin acentos ni ñ. |
| VIII. Operaciones transaccionales | El refresh persiste ligas, equipos y jugadores en una única transacción. |
| IX. Integraciones externas | Solo `FootballDataAdapter` conoce la API; las lecturas locales no llaman proveedores. |

**Post-Phase 1: PASS.** El diseño conserva el catálogo previo ante fallas porque el Adapter
completa la carga antes de abrir la transacción y el Repository revierte cualquier error de
persistencia. La futura integración de WhoScored tiene un límite de carpeta explícito y no
se agrega al módulo actual.

## Project Structure

### Documentation (this feature)

```text
specs/004-catalogo-jugadores/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
├── validation.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── migrations/1727000000000-CreateCatalogoJugadores.ts
├── src/
│   ├── app.module.ts
│   ├── common/filters/http-exception.filter.ts
│   ├── config/environment.ts
│   ├── configure-app.ts
│   ├── database/data-source.ts
│   └── players/
│       ├── domain/{liga,equipo,jugador}.ts
│       ├── dto/{listar-jugadores,jugador-response,refresh-catalogo-response}.dto.ts
│       ├── persistence/{liga,equipo,jugador}.entity.ts
│       ├── persistence/typeorm-players.repository.ts
│       ├── adapters/football-data/{football-data.adapter,football-data.types}.ts
│       ├── adapters/whoscored/README.md
│       ├── players.repository.ts
│       ├── catalogo-jugadores.service.ts
│       ├── actualizar-catalogo.service.ts
│       ├── players.controller.ts
│       └── players.module.ts
└── test/
    ├── unit/players/{domain,football-data.adapter,services}.spec.ts
    └── integration/players/{catalog,players-integration-app}.ts
```

**Structure Decision**: Se conserva `backend/` como servicio único y se agrega `src/players`
con las carpetas definidas por el documento de contexto. La segunda spec podrá incorporar
`domain/estadisticas-jugador.ts`, `dto/estadisticas-jugador-response.dto.ts`, la entidad de
estadísticas y `adapters/whoscored/whoscored.adapter.ts` sin mezclar responsabilidades con
la carga base.

## Implementation Design

1. `FootballDataAdapter` consulta `GET /v4/competitions/{code}/teams` y luego el recurso de
   cada equipo `GET /v4/teams/{id}` para traducir la plantilla vigente a `CatalogoBase`.
2. `ActualizarCatalogoService` obtiene el catálogo completo antes de persistir y delega la
   transacción al repository.
3. `TypeOrmPlayersRepository` hace upsert por `proveedor_id`, conserva UUIDs internos,
   resuelve las relaciones por mapas de IDs y usa una transacción única.
4. `CatalogoJugadoresService` expone lecturas locales. El controller transforma resultados
   a DTOs y valida UUIDs con `ParseUUIDPipe`.
5. El módulo exporta tokens de repository y adapter para permitir mocks en unitarios y en
   integración; no hay dependencia directa desde dominio hacia Nest, TypeORM o HTTP.

## Complexity Tracking

No hay violaciones constitucionales ni excepciones de complejidad que justificar.

## Trazabilidad y verificación

| Requisitos | Evidencia prevista |
|---|---|
| FR-001–FR-003 | Modelos de dominio, entidades, migración y tests de persistencia. |
| FR-004–FR-008 | Configuración de competencias, adapter, refresh transaccional y tests de adapter/service. |
| FR-009–FR-010 | Contrato OpenAPI, controller/service/repository y tests HTTP locales. |
| FR-011–FR-012 | DTOs, `ValidationPipe`, Swagger y contrato `contracts/openapi.yaml`. |
| FR-013 | Tests unitarios, integración con PostgreSQL/Testcontainers, build, lint y quickstart. |
| SC-001–SC-004 | Casos de upsert, repetición, proveedor caído y rollback. |
| SC-005 | Swagger, Postman y ejecución documentada del quickstart. |
