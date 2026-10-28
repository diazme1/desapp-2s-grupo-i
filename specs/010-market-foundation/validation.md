# Evidencia de cierre: fundamentos del mercado de jugadores

Este archivo es la ubicación única de la evidencia de cierre de la feature. Se mantiene
separado del código fuente y de los tests, y se completa durante T044.

## Alcance de la validación

La evidencia debe cubrir registro con saldo inicial, inicialización idempotente de tokens,
tenencias, apertura de cotización, exactitud decimal, rollback, restricciones PostgreSQL,
resiliencia de lecturas locales y compatibilidad de los endpoints existentes.

## Comandos y resultados

| Verificación | Comando o consulta | Resultado | Evidencia / observaciones |
|---|---|---|---|
| Build | `npm run build` desde `backend/` y `docker compose exec -T api npm run build` | PASS | Nest compiló sin errores dentro y fuera del contenedor. |
| Lint | `npm run lint` desde `backend/` | PASS | 0 warnings y 0 errors. |
| Migraciones | `docker compose up` y `docker compose exec -T api npx typeorm-ts-node-commonjs migration:show -d src/database/data-source.ts` | PASS | Las 13 migraciones figuran aplicadas y no quedan migraciones pendientes. Las tablas de cotizaciones, saldos, tokens y tenencias existen en PostgreSQL. Se conserva como observación la existencia histórica de timestamps duplicados. |
| Tests unitarios | `npm run test:unit` desde `backend/` | PASS | 46 suites y 206 tests aprobados. |
| Tests de integración | `npm run test:integration` desde `backend/` | PASS | 19 suites y 61 tests aprobados contra PostgreSQL/Testcontainers. |
| Quickstart | `docker compose config --quiet`, consultas de migraciones y verificación de PostgreSQL | PASS parcial | Compose es válido y el esquema/migraciones fueron verificados. Queda pendiente la ejecución manual completa de los pasos operativos de registro, concurrencia y reintentos descritos en `quickstart.md`. |

## Casos obligatorios

- Registro nuevo, duplicado, concurrencia y rollback de usuario más saldo.
- Catálogo vacío sin tokens, tenencias, apertura ni datos parciales.
- Emisión de 100 tokens por jugador, reintentos, concurrencia, jugador nuevo y propietario
  previamente modificado.
- Round-trip exacto de `Cotizacion` entre PostgreSQL, dominio y DTO.
- Rollback de migraciones y respeto de FKs, checks y unicidades.
- Lecturas locales funcionando cuando el proveedor externo no está disponible.

## Estado de cierre

La implementación y las suites automatizadas cumplen los resultados esperados. La evidencia
manual completa del quickstart queda pendiente antes de marcar T044 como cerrada. La
duplicación histórica de timestamps de migraciones no produjo migraciones pendientes ni
fallos en la ejecución, pero debe conservarse sin renombrar porque las identidades ya están
registradas en PostgreSQL.
