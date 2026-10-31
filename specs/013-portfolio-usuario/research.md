# Research: Portfolio de usuario

No quedan decisiones de alcance pendientes.

## Fuente de datos

**Decisión**: reutilizar `PLAYERS_DATA_SOURCE`, que ya contiene usuarios, jugadores, cotizaciones,
tokens, tenencias y transacciones.

**Motivo**: evita conexiones paralelas y permite leer todo el portfolio en un único snapshot.
No se agregan entidades persistentes, tablas ni migraciones.

## Consistencia y solo lectura

**Decisión**: ejecutar el repository en una transacción PostgreSQL `REPEATABLE READ` con
`READ ONLY`, sin locks de escritura.

**Motivo**: la respuesta combina cuatro tablas y el puntero de estrategia activa; todas deben
leerse desde la misma vista temporal sin modificar estado.

**Alternativas descartadas**: consultas independientes o reutilizar la UoW de órdenes, porque
podrían mezclar snapshots y están diseñadas para mutar el mercado.

## Autorización

**Decisión**: conservar `JwtAuthGuard` y `OwnershipService`; el Service verifica existencia del
usuario mediante el mismo snapshot antes de calcular.

**Motivo**: mantiene el comportamiento `401`/`403` existente y evita una autorización paralela.

## Cotización vigente

**Decisión**: usar solo la estrategia y `id_recalculo` de `recalculo_cotizacion_activo`, junto
con la fila alineada de `cotizacion_vigente`.

**Motivo**: coincide con `market-buy` y `market-sell`; `historial_cotizacion`, ranking y otras
estrategias no son fuente de precio actual.

## Cálculo exacto

**Decisión**: calcular con `bigint` y `Cotizacion`/`Creditos`; el promedio ponderado usa solo
transacciones `COMPRA`. El redondeo half-up a dos posiciones ocurre al serializar.

**Alternativa descartada**: `number` o incorporar FIFO/costo de ventas, porque perdería exactitud
o ampliaría el alcance del spec.

## Verificación

**Decisión**: agregar suites nuevas de dominio, integración y HTTP; reutilizar el helper de
Testcontainers de órdenes sin modificar tests existentes. Actualizar Swagger y Postman solo para
el nuevo GET.
