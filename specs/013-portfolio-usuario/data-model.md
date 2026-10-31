# Modelo de datos: Portfolio de usuario

La feature no agrega tablas ni persiste un portfolio. El repository arma un read model dentro de
una transacción `REPEATABLE READ` y `READ ONLY`.

## Datos existentes reutilizados

- **Usuario** (`usuarios`): valida que el `id` exista después de autorizar ownership.
- **TenenciaJugador** (`tenencias_jugador`): `usuarioId`, `jugadorId` y `cantidadTokens` positiva
  que define las posiciones a devolver.
- **TokenJugador** (`tokens`): conteo individual por usuario y jugador; debe coincidir con la
  tenencia agregada.
- **Estrategia activa** (`recalculo_cotizacion_activo`): `tipoEstrategia` e `idRecalculo` usados
  para resolver el precio actual.
- **CotizacionVigente** (`cotizacion_vigente`): cotización por jugador y estrategia, válida solo
  si su `idRecalculo` coincide con el activo.
- **TransaccionMercado** (`transacciones_mercado`): filas `COMPRA` del usuario y jugador, con
  `cantidadTokens` y `cotizacion`; las `VENTA` se ignoran.

## Read model

```text
PortfolioReadModel {
  usuarioId: string
  posiciones: [{ jugadorId, cantidadTokens, tokensIndividuales }]
  estrategiaActiva: string | null
  idRecalculoActivo: string | null
  cotizaciones: [{ jugadorId, cotizacion: Cotizacion }]
  compras: [{ jugadorId, cantidadTokens, cotizacion: Cotizacion }]
}
```

## Resultado calculado

```text
PosicionPortfolio {
  idJugador: UUID
  cantidadTokens: integer
  cotizacionVigente: decimal string
  precioPromedioCompra: decimal string | null
  valorActual: decimal string
  gananciaPerdida: decimal string | null
}
```

Reglas:

- `promedio = sum(cantidadCompra × cotizacionCompra) / sum(cantidadCompra)`.
- `valorActual = cantidadTenencia × cotizacionVigente`.
- `gananciaPerdida = valorActual - costoDeAdquisicionDeLaTenencia`, manteniendo la fracción
  exacta hasta el redondeo de presentación.
- Sin compras, promedio y ganancia son `null`.
- Tenencia y tokens desalineados, o cotización activa ausente, producen error `409`.
- Las posiciones se ordenan por `idJugador` ascendente.
