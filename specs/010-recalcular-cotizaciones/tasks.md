# Tareas: Cotizaciones por estrategia

**Alcance**: recálculo síncrono de ambas estrategias y consulta del ranking por filtro.

## US1 — Recálculo y selección de estrategia

- [x] T001 [US1] Definir estrategias v1 y verificar fórmula en `backend/src/players/domain/estrategia-cotizacion.ts` y `backend/test/unit/players/estrategia-cotizacion.spec.ts`.
- [x] T002 [US1] Persistir historial append-only, corridas, estrategia activa y cotización vigente por jugador/estrategia en `backend/migrations/` y `backend/src/players/persistence/`.
- [x] T003 [US1] Calcular ambas estrategias en una transacción y activar la elegida en `backend/src/quotes/recalcular-cotizaciones.service.ts`.
- [x] T004 [US1] Provisionar el superadmin y exponer recálculo restringido y ranking filtrable en `backend/src/auth/`, `backend/src/quotes/` y `backend/src/players/players.module.ts`.
- [x] T005 [US1] Actualizar tests, OpenAPI, Postman y guía de uso en `backend/test/`, `docs/postman/players-catalog.postman_collection.json` y `backend/README.md`.
- [ ] T006 [US1] Ejecutar integraciones PostgreSQL de recálculo y ranking en `backend/test/integration/players/`; pendiente: Docker Desktop no ofrece un runtime disponible.

**Dependencias**: T001–T002 habilitan T003; T003 habilita T004–T005. Validar T006 al disponer de PostgreSQL/Testcontainers.
