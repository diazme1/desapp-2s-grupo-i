# Tareas: Historial de cotizaciones por jugador

**Alcance**: US1 historial y US2 superadmin. Se incluyen pruebas porque se pidió verificar el cambio.

## Setup

- [x] T001 [P] Confirmar scripts y registro de entidades/migraciones en `backend/package.json` y `backend/src/database/data-source.ts`.

## US1 — Historial (P1, MVP)

**Prueba independiente**: `backend/test/integration/players/quote-history.spec.ts` valida orden, páginas, vacío y errores.

- [x] T002 [P] Crear tabla y entidad en `backend/migrations/1790275838000-CreateHistorialCotizacion.ts` y `backend/src/players/persistence/historial-cotizacion.entity.ts`.
- [x] T003 Implementar consulta, servicio, DTOs y endpoint en `backend/src/quotes/`, `backend/src/players/persistence/typeorm-players.repository.ts` y `backend/src/players/players.controller.ts`.
- [x] T004 Cubrir comportamiento y OpenAPI en `backend/test/unit/players/`, `backend/test/unit/documentation/quote-history-openapi.spec.ts` y `backend/test/integration/players/quote-history.spec.ts`.
- [x] T005 Documentar el request en `docs/postman/players-catalog.postman_collection.json`.

## US2 — Superadmin (P1)

**Prueba independiente**: bootstrap idempotente, contraseña hasheada y registro común sin elevación.

- [x] T006 Agregar rol y bootstrap configurable en `backend/migrations/1790275837000-AddUserRoles.ts`, `backend/src/users/`, `backend/src/config/environment.ts` y `backend/src/auth/superadmin-bootstrap.service.ts`.
- [x] T007 Cubrir bootstrap/registro y documentar variables en `backend/test/unit/auth/`, `backend/test/integration/auth/register.spec.ts`, `backend/.env.example` y `backend/README.md`.

## Verificación

- [x] T008 Ejecutar build, lint, pruebas unitarias y validar JSON de Postman con `backend/package.json` y `docs/postman/players-catalog.postman_collection.json`.
- [ ] T009 Ejecutar integración con PostgreSQL en `backend/test/integration/players/quote-history.spec.ts` y `backend/test/integration/auth/register.spec.ts`.

**T009 pendiente**: Testcontainers no encontró runtime y PostgreSQL local rechazó `127.0.0.1:5433`.

**Orden**: T001 antes de ambas historias; US1 y US2 son paralelas; MVP: US1. Requisitos: US1 → FR-001–FR-004; US2 → FR-005–FR-006.
