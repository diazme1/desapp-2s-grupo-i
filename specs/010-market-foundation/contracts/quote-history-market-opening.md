# Contrato de compatibilidad: apertura inicial del historial de cotizaciones

Esta feature no agrega endpoints públicos. Mantiene `GET /players/{id}/quotes` y su
paginación actuales, pero agrega una variante legítima del item de historial para la apertura
del Mercado.

## Item de apertura

Cuando `tipoEstrategia` es `apertura_mercado`:

- `cotizacion` es exactamente `1.00`;
- `idVersionEstrategia` contiene el UUID estable de la versión de la estrategia de apertura;
- `idRecalculo` es `null`;
- `idEstadistica` es `null`;
- la fila es única por jugador y no se sobrescribe.

Las cotizaciones calculadas existentes conservan sus referencias UUID no nulas y su respuesta
actual. El endpoint no crea, actualiza ni elimina cotizaciones; la apertura se registra solo
como efecto interno de la inicialización idempotente del Mercado.

## Compatibilidad

- Ruta, método, parámetros de paginación, orden y códigos HTTP existentes no cambian.
- El esquema OpenAPI debe marcar `idRecalculo` e `idEstadistica` como nullable.
- No se agregan endpoints de saldo, tenencias, compra, venta, portfolio ni transacciones.
