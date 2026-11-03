# Plan: Historial de cotizaciones por jugador

**Branch**: `feature/historial-cotizaciones` · **Spec**: [spec.md](spec.md)

## Enfoque

Extender el backend existente con NestJS, TypeScript, TypeORM y PostgreSQL. El endpoint sigue `Controller → Service → Repository`; Swagger se genera desde DTOs y decoradores. El superadmin se crea durante el bootstrap con configuración operacional.

## Cambios

- Historial: tabla append-only, entidad, consulta paginada y DTO de respuesta.
- Superadmin: rol persistido, validación de configuración y bootstrap idempotente; el registro normal conserva `usuario`.
- Documentación: OpenAPI, Postman y guía corta de validación.
- Pruebas: unitarias y de integración con PostgreSQL/Testcontainers.

## Decisiones y límites

- Orden estable: `fecha_hora DESC, id DESC`; página 1, límite 20, máximo 100.
- La tabla referencia jugador y estadísticas; versión de estrategia y recálculo quedan como UUID porque sus escritores no están en este alcance.
- No se calcula ni se inserta ninguna cotización desde este endpoint.
- La integración requiere PostgreSQL. En la verificación actual no hubo runtime de contenedores ni DB local accesible.

## Constitución

Se reutilizan stack y capas; se validan entradas y existencia del jugador. Se preserva el historial y se documenta la API. La integración queda pendiente, no aprobada.

## Archivos principales

- Endpoint: `backend/src/players/players.controller.ts`, `backend/src/quotes/`, `backend/src/players/persistence/typeorm-players.repository.ts`.
- Persistencia y bootstrap: `backend/migrations/`, `backend/src/auth/`, `backend/src/users/`.
- Verificación y docs: `backend/test/`, `docs/postman/players-catalog.postman_collection.json`.
