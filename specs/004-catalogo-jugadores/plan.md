# Implementation Plan: Catálogo de jugadores

**Branch**: `004-catalogo-jugadores` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-catalogo-jugadores/spec.md`

## Summary

Implementar un catálogo local de jugadores de las cinco ligas requeridas, con modelo
de dominio independiente, persistencia PostgreSQL y endpoints de consulta. La lectura
del catálogo será local y se cargará mediante una migración/seed determinista para
esta entrega. La futura importación desde WhoScored queda fuera de este plan: solo se
preserva la identidad externa `proveedor` + `externalId` y el contrato canónico que
consumirá el Adapter posterior.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 22.11.x

**Primary Dependencies**: NestJS 11, TypeORM 0.3, class-validator, class-transformer,
@nestjs/swagger, Jest 30, Supertest y Testcontainers 11

**Storage**: PostgreSQL 16 mediante TypeORM; migraciones y seed determinista

**Testing**: Tests unitarios Jest sin NestJS ni base de datos para dominio; tests de
integración Jest/Supertest contra PostgreSQL real levantado con Testcontainers

**Target Platform**: Backend REST ejecutado con Node.js; desarrollo y CI con Docker

**Project Type**: Web service REST monolítico modular en NestJS

**Performance Goals**: Resolver consultas del catálogo con una consulta local indexada,
sin llamadas externas ni paginación en esta entrega; no se fija un objetivo de carga
superior al alcance académico.

**Constraints**: Las lecturas no dependen de proveedores externos. El dominio no puede
depender de NestJS, HTTP, TypeORM ni PostgreSQL. No se implementan scraping, Adapter,
endpoint de importación ni estadísticas detalladas.

**Scale/Scope**: Cinco ligas, equipos y jugadores locales suficientes para cubrir el
seed y los escenarios de aceptación; sin paginación, historial de transferencias ni
escrituras públicas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Stack tecnológico**: PASS. Se mantiene TypeScript, NestJS y PostgreSQL.
- **II. Arquitectura en capas**: PASS. El flujo será
  `Controller -> Service -> Domain Model / Repository`; no hay integración externa
  en esta feature.
- **III. Modelo rico**: PASS. `Liga`, `Equipo`, `Jugador` e identidad externa
  protegerán sus invariantes mediante fábricas y métodos de dominio.
- **IV. Validación por nivel**: PASS. DTOs validan forma y normalización; el Service
  resuelve entidades y casos de uso; el dominio protege invariantes.
- **V. Tests y protección**: PASS. Se agregan tests unitarios e integración sin
  modificar ni eliminar tests existentes.
- **VI. Terminado**: PASS. El plan incluye build, tests, Swagger y Postman.
- **VII. Idioma**: PASS. Documentación y errores en español; nuevos identificadores
  de dominio sin acentos ni ñ.
- **IX. Integraciones externas**: PASS. No se consume ningún proveedor en esta
  feature; el Adapter queda explícitamente delegado a la feature de scraping.

No se identifican violaciones que requieran Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-catalogo-jugadores/
├── plan.md              # Este archivo
├── research.md          # Decisiones y alternativas
├── data-model.md        # Entidades, relaciones e invariantes
├── quickstart.md        # Validacion local de la feature
├── contracts/
│   └── openapi.yaml     # Contrato de los endpoints
└── tasks.md             # Generado luego por $speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── players/
│   │   ├── domain/
│   │   ├── dto/
│   │   ├── persistence/
│   │   ├── players.controller.ts
│   │   ├── players.module.ts
│   │   ├── players.repository.ts
│   │   └── catalogo-jugadores.service.ts
│   ├── app.module.ts
│   ├── configure-app.ts
│   └── database/data-source.ts
├── migrations/
│   └── *-CreateCatalogoJugadores.ts
└── test/
    ├── unit/players/
    └── integration/players/

docs/
└── postman/players.postman_collection.json
```

**Structure Decision**: Se mantiene el backend único existente. El módulo `players`
separa dominio, DTOs, caso de uso, puerto de repository y persistencia TypeORM. La
configuración de NestJS conecta el módulo con PostgreSQL, mientras que los tests
unitarios del dominio permanecen fuera de NestJS. No se agrega todavía un directorio
de adapters porque esta feature no realiza llamadas externas.

## Design Details

### Flujo de lectura

`PlayersController` valida query parameters y UUIDs, `CatalogoJugadoresService`
normaliza el caso de uso y solicita datos a `JugadorRepository`. La implementación
`TypeOrmJugadorRepository` realiza la consulta con joins a equipo y liga, filtra
jugadores activos, ordena por `nombre` y luego por `id`, y devuelve modelos de dominio.
Los DTOs de response transforman esos modelos al contrato público sin exponer
`proveedor` ni `externalId`.

### Persistencia y consistencia

La migración crea tablas para `ligas`, `equipos`, `jugadores` e
`identidades_externas_jugador`, índices para los filtros y restricciones de unicidad.
La relación equipo-liga se refuerza en el dominio y en PostgreSQL mediante claves
foráneas. La identidad externa tiene una restricción única sobre
`(proveedor, external_id)`. La migración carga un seed mínimo determinista con las
cinco ligas y jugadores activos suficientes para demostrar el catálogo.

### Validación y errores

Los endpoints del catálogo usarán un `ValidationPipe` específico con HTTP 400 para
filtros y parámetros inválidos, sin cambiar el `ValidationPipe` global que utiliza
HTTP 422 en autenticación. El `HttpExceptionFilter` seguirá generando mensajes en
español. Un UUID bien formado pero inexistente o inactivo se resuelve como 404.

### Futuro Adapter

No se crea `WhoscoredJugadoresAdapter` en esta feature. El modelo conserva
`proveedor` y `externalId`, y la documentación de la spec define el registro canónico
que una feature posterior deberá producir antes de persistir. La futura integración
debe ser `ImportacionService -> FuenteJugadoresAdapter -> repository`, sin que el
Controller, el dominio o el repository llamen a WhoScored.

### Tests y documentación

Los tests de dominio cubren invariantes y normalización sin NestJS ni base de datos.
Los tests de integración ejecutan migraciones contra PostgreSQL/Testcontainers y
verifican persistencia, filtros, orden, duplicados y errores HTTP con Supertest.
Swagger documenta ambos endpoints y sus respuestas; Postman incluye listado, filtros
y detalle.

## Complexity Tracking

Sin violaciones constitucionales.
