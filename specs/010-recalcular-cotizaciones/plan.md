# Plan: Recalcular cotizaciones

**Rama**: `feature/recalcular-cotizaciones` · **Fecha**: 2026-10-22 · **Spec**: [spec.md](spec.md)

## Enfoque

NestJS, TypeScript, TypeORM y PostgreSQL. Mantener `Controller → Service → Domain / Repository`. El controller valida la estrategia y aplica JWT + guard de superadmin. El service orquesta la estrategia v1; el dominio calcula con centavos enteros y `bigint`.

La persistencia ejecuta una única transacción: bloquear el estado activo, leer la última estadística por jugador, calcular las dos versiones inmutables, insertar una corrida e historial por estrategia, actualizar `cotizacion_vigente` mediante upsert por jugador y estrategia y apuntar a la corrida elegida al final. Cualquier error revierte todo. La ejecución es síncrona y no usa adapters externos.

## Datos y rutas

- Añadir `fecha_captura` a estadísticas; índice `(id_jugador, fecha_captura DESC, id DESC)`.
- Persistir versiones JSONB, corridas por estrategia y una fila singleton con corrida y estrategia activa.
- Reusar `historial_cotizacion` como tabla append-only.
- Agregar `cotizacion_vigente`, con clave por jugador y estrategia, y procedencia a corrida y estadísticas; el bootstrap idempotente crea el superadmin compartido desde `.env.example`.
- `POST /quotes/recalculate`, `GET /players/ranking?estrategia=...`, Swagger y colección `docs/postman/players-catalog.postman_collection.json`.
- Archivos principales: `backend/src/quotes/`, `backend/src/auth/guards/`, `backend/src/players/persistence/`, `backend/migrations/`.

## Verificación y límites

- Tests de dominio para pesos, faltas, nulos y precisión; integración con PostgreSQL/Testcontainers para autorización, ambas estrategias, ranking y rollback; prueba de OpenAPI.
- Build, lint, pruebas unitarias e integración disponibles en `backend/package.json`.
- Las filas previas reciben `fecha_captura = now()` al migrar; su orden real anterior no se puede reconstruir. En empates se usa ID descendente.
- No se implementan scraper, scheduler ni frontend.

## Constitución

Se conserva la aritmética exacta, el historial append-only y la separación de capas. Los tests existentes del feature se actualizan con autorización explícita de la usuaria. Los endpoints se documentan en OpenAPI y Postman.
