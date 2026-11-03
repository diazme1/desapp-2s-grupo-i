# Data Model: Historial de operaciones de Mercado

## Entidades reutilizadas

### Transacción de Mercado (`transacciones_mercado`)

Registro persistido, append-only e inmutable que ya representa compras y ventas.

| Campo persistido | Uso en la lectura | Exposición pública |
|---|---|---|
| `id_operacion` | Identidad y desempate | `idOperacion` |
| `tipo` | Tipo de operación | `tipo` (`COMPRA`/`VENTA`) |
| `id_usuario_comprador` / `id_usuario_vendedor` | Aislamiento del historial | No |
| `id_jugador` | Jugador operado | `idJugador` |
| `cantidad_tokens` | Cantidad operada | `cantidadTokens` |
| `cotizacion` | Snapshot por token | `cotizacion` como string decimal |
| `importe_creditos` | Importe total persistido | `importe` como string decimal |
| `fecha_hora` | Fecha de realización y orden | `fechaHora` |
| `clave_idempotencia`, `tipo_estrategia`, `id_version_estrategia`, `id_recalculo` | Metadatos de operación | No |

### Jugador (`jugadores`)

Se consulta únicamente `nombre_completo` para enriquecer la operación con el jugador identificado
por `idJugador`. No aporta operaciones, cotizaciones, importes ni otros datos del historial.

La entidad TypeORM y sus restricciones existentes se reutilizan. No se modifica su esquema.

## Read model no persistido

```text
HistorialReadModel {
  usuarioId: UUID
  usuarioExiste: boolean
  operaciones: TransaccionHistorialRead[]
}

TransaccionHistorialRead {
  idOperacion: UUID
  tipo: 'COMPRA' | 'VENTA'
  jugadorId: UUID
  nombreCompleto: string | null
  cantidadTokens: integer > 0
  cotizacion: Cotizacion
  importeCreditos: bigint >= 0
  fechaHora: timestamptz
}
```

El Repository solo carga y ordena este modelo. El mapeo público del DTO reutiliza los tipos
existentes y valida que el tipo sea uno de los dos permitidos, que la cantidad sea positiva y que
los valores monetarios puedan representarse con `Cotizacion`/`Creditos`; una falla se transforma
en `409` sin respuesta parcial.

## Response model

```text
HistorialTransaccionesResponse {
  usuarioId: UUID
  operaciones: TransaccionHistorialResponse[]
}

TransaccionHistorialResponse {
  idOperacion: UUID
  tipo: 'COMPRA' | 'VENTA'
  idJugador: UUID
  nombreCompleto: string | null
  cantidadTokens: integer
  cotizacion: string // dos posiciones decimales
  importe: string    // créditos totales, dos posiciones decimales
  fechaHora: ISO-8601 timestamp
}
```

## Orden y lectura

- Filtro: `id_usuario_comprador = :usuarioId OR id_usuario_vendedor = :usuarioId`.
- Orden: `fecha_hora DESC, id_operacion ASC`.
- Sin operaciones: `operaciones: []`.
- La consulta ocurre en un snapshot `REPEATABLE READ` y `READ ONLY`.
- No hay transiciones de estado: el historial es una vista proyectada de registros existentes.
