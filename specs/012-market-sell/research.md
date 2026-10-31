# Investigación: venta de tokens

## Decisión 1: persistencia común

**Decisión**: migrar `ordenes_compra` y `auditorias_orden_compra` a
`transacciones_mercado` y `auditorias_transaccion`, usando `tipo = COMPRA` o `VENTA`.

**Motivo**: compras y ventas comparten partes, jugador, cantidad, cotización, importe,
idempotencia y auditoría. Una única fuente evita dos historiales y simplifica futuras
consultas.

**Límite**: no crear un framework de eventos ni soportar tipos distintos de compra y venta.
La migración debe copiar los registros existentes antes de retirar las tablas anteriores. Se
autoriza adaptar los tests existentes de `market-buy` que dependan de los nombres antiguos;
no se eliminan tests ni se modifican tests ajenos a Mercado.

## Decisión 2: saldo del superadmin

**Decisión**: permitir saldo exacto negativo únicamente al superadmin. Los usuarios comunes
siguen sujetos a saldo no negativo.

**Motivo**: la regla de negocio exige que el superadmin recompre siempre y el débito debe
quedar registrado para conservar la trazabilidad de la operación.

**Alternativas descartadas**:

- saldo ilimitado no persistido: pierde el débito contable;
- rechazar por saldo insuficiente: contradice la regla de recompra siempre;
- crédito artificial por venta: oculta la diferencia entre liquidez y saldo.

La implementación debe separar el value object de importes no negativos del value object de
saldos exactos con signo y proteger la excepción por rol.

## Decisión 3: cotización

**Decisión**: reutilizar `ActiveQuoteResolver` dentro de la misma UoW de compra.

La venta bloquea la estrategia activa y la fila de `cotizacion_vigente`, verifica el mismo
`idRecalculo` y conserva el snapshot. No consulta el historial ni otra estrategia.

## Decisión 4: tokens y concurrencia

**Decisión**: bloquear los tokens del vendedor para el jugador y seleccionar los primeros por
`numero_emision` ascendente. Compra y venta deben compartir el orden de locks y reintentar
únicamente `40001` y `40P01`, hasta tres intentos.

**Motivo**: evita transferir un token dos veces y permite comprobar que la tenencia agregada
coincide con los propietarios individuales.

## Decisión 5: idempotencia

**Decisión**: conservar exactamente el contrato ya implementado: header normalizado, índice
único y replay de la operación confirmada. La clave se vincula al tipo, actor y payload.

**Motivo**: las operaciones son atómicas e idempotentes según la Constitución y `sell` debe
mantener el mismo contrato que `buy`.
