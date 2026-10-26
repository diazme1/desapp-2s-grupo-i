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
| Build | `npm run build` desde `backend/` | PASS | Ejecutado después de la implementación; Nest compiló sin errores. |
| Lint | `npm run lint` desde `backend/` | PASS | 0 warnings y 0 errors. |
| Migraciones | Comandos de migración definidos en `backend/package.json` | Pendiente de ejecución | |
| Tests unitarios | `npm run test:unit` desde `backend/` | PASS parcial | 41 suites pasan (193 tests); permanece un fallo ambiental preexistente de Supertest por `listen EPERM` en `quote-history-openapi.spec.ts`. Las suites nuevas también pasan. |
| Tests de integración | `npm run test:integration` desde `backend/` | Bloqueado por entorno | Testcontainers no encuentra runtime; las suites contra PostgreSQL local fallan al conectar a `::1/127.0.0.1:5433` con `EPERM`. No se pudo validar la ejecución real de PostgreSQL en este entorno. |
| Quickstart | Verificaciones de `quickstart.md` | Pendiente de ejecución | |

## Casos obligatorios

- Registro nuevo, duplicado, concurrencia y rollback de usuario más saldo.
- Catálogo vacío sin tokens, tenencias, apertura ni datos parciales.
- Emisión de 100 tokens por jugador, reintentos, concurrencia, jugador nuevo y propietario
  previamente modificado.
- Round-trip exacto de `Cotizacion` entre PostgreSQL, dominio y DTO.
- Rollback de migraciones y respeto de FKs, checks y unicidades.
- Lecturas locales funcionando cuando el proveedor externo no está disponible.

## Estado de cierre

La feature solo puede marcarse como terminada cuando todas las verificaciones tienen resultado
registrado, los tests existentes permanecen sin modificaciones y no quedan incidencias abiertas.
