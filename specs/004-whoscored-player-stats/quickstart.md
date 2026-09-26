# Quickstart: estadísticas WhoScored en `POST /catalog/refresh`

## Estado de la implementación base

El catálogo ya está mergeado y constituye la fuente de verdad. El endpoint existente:

```text
POST /catalog/refresh?ligaCodigo=PL
```

continúa siendo el único punto de entrada HTTP. La primera etapa obtiene y persiste ligas, equipos y jugadores. Después del commit, `ActualizarCatalogoService` procesa secuencialmente los jugadores resultantes y ejecuta la segunda etapa de estadísticas.

No se agrega otro endpoint y no se debe llamar a Football-Data una segunda vez.

## Prerrequisitos

Desde `backend/`:

```bash
npm install
```

Se requiere PostgreSQL para la aplicación y Docker disponible para los tests Testcontainers. La configuración local debe proporcionar `DATABASE_URL` y las credenciales ya requeridas por Auth.

Antes de fijar el transporte externo, validar con el Node del backend:

```bash
node --version
node -e "console.log(typeof fetch, typeof AbortController)"
```

También debe ejecutarse una request mínima controlada a WhoScored, un abort por timeout y un error de red. Esa comprobación está descrita en [research.md](./research.md); no forma parte de los tests unitarios.

## Validación local del diseño

Ejecutar en este orden:

```bash
npm run build
npm run lint
npm run test:unit
npm run test:integration
```

Los unit tests no requieren internet, Football-Data, WhoScored ni un catálogo previamente cargado. Usan fixtures del adapter y fakes de `JugadorLookupPort`, `WhoScoredAdapter` y writer/service.

## Fixtures de WhoScored

Ubicación prevista:

```text
backend/test/unit/players/fixtures/whoscored/
```

Debe haber fixtures sanitizados para:

- candidato único con las siete métricas;
- registro correcto por liga/equipo/temporada/jugador;
- nombre ambiguo o múltiples registros válidos;
- jugador no encontrado;
- valores `0`;
- campos faltantes y ausencia total;
- estructura inesperada.

Timeout, HTTP no disponible y errores de red usan un transporte fake; no se hacen llamadas live en unit tests.

## Verificación del flujo de refresh

La suite de integración de `POST /catalog/refresh` debe sustituir `EstadisticasJugadorService` o sus ports por un fake controlado. Con una fuente de catálogo fake, comprobar:

1. la primera etapa persiste el catálogo y entrega a la segunda etapa los IDs UUID reales y contexto de los mismos jugadores;
2. cada jugador recibe una invocación independiente;
3. el resumen conserva `fuente`, `ligas`, `equipos`, `jugadores`, tiempos y fecha;
4. `estadisticas` informa `estado`, `procesados`, `exitosos`, `parciales` y `fallidos`;
5. éxito parcial o ausencia total de estadísticas mantiene HTTP 200;
6. un fallo de un jugador no evita procesar los siguientes ni revierte el catálogo;
7. una falla de la primera etapa mantiene el contrato de error existente y no invoca estadísticas;
8. el cuerpo HTTP no incluye detalle individual de jugadores.

La asociación de persistencia se verifica con PostgreSQL/Testcontainers: FK válida, varias observaciones por jugador, asociación de varios jugadores y ausencia de filas huérfanas tras un error de escritura.

## Escenario de aceptación SC-005

El test debe usar al menos 20 `idJugador` distintos y 20 fixtures/fakes controlados. Para cada caso debe verificar ID, matching, asociación independiente y las siete métricas cuando estén disponibles. No se usa un catálogo real ni Football-Data.

## Migraciones

El catálogo actual usa `backend/migrations/1727000000000-CreateCatalogoJugadores.ts`. Antes de implementar estadísticas se debe inspeccionar nuevamente la secuencia y crear la migración concreta posterior, prevista como:

```text
backend/migrations/1790275835000-CreateEstadisticasJugadores.ts
```

La migración crea `estadisticas_jugadores`, su PK, FK restrictiva a `jugadores(id)`, checks, columnas nullable e índice por `id_jugador`. No crea ni altera una tabla temporal de jugadores.

## Contratos y modelo

- Resumen HTTP: [contracts/refresh-catalogo.md](./contracts/refresh-catalogo.md)
- Entidades y estados: [data-model.md](./data-model.md)
- Decisiones de WhoScored y transacciones: [research.md](./research.md)

## Startup smoke test

Después de build, lint y tests:

```bash
npm run start
```

Confirmar que el proceso levanta y permanece sin error durante el tiempo mínimo necesario para observar el startup. Finalizarlo de forma controlada. Si termina con error o no inicia, la validación falla. No se agregan scripts ni mecanismos de despliegue.
