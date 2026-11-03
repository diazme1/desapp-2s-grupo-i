# Modelo de datos: Compra de tokens

## Entidades existentes reutilizadas

- **Usuario** (`usuarios`): identidad, rol `usuario` o `superadmin`; el comprador se resuelve
  por el `sub` del JWT y el vendedor por `SUPERADMIN_EMAIL`.
- **SaldoUsuario** (`saldos_usuario`): `creditos_disponibles` en unidades mínimas `bigint`.
  El comprador debe tener fila; el saldo del superadmin ausente equivale a cero y se crea solo
  al acreditar una compra.
- **TokenJugador** (`tokens`): 100 filas por jugador, propiedad individual y número de emisión
  único. La compra cambia `id_usuario_owner` mediante `TokenJugador.transferirA`.
- **TenenciaJugador** (`tenencias_jugador`): una fila por usuario/jugador; su cantidad coincide
  con el conteo de tokens individuales.
- **Estrategia activa** (`recalculo_cotizacion_activo`): fila `id = 1` con estrategia y
  `id_recalculo`; nulos significan que no hay compra posible.
- **Cotización vigente** (`cotizacion_vigente`): una fila por jugador/estrategia. Solo se usa la
  fila cuyo jugador, estrategia e `id_recalculo` coinciden con el estado activo.

## Entidades nuevas

### OrdenCompra — `ordenes_compra`

| Campo | Tipo/regla |
|---|---|
| `id_operacion` | UUID PK. |
| `clave_idempotencia` | Texto obligatorio, normalizado, de 1–128 caracteres ASCII permitidos, `UNIQUE`. |
| `id_usuario_comprador` | UUID FK a `usuarios`, obligatorio. |
| `id_usuario_vendedor` | UUID FK a `usuarios`, obligatorio y superadmin. |
| `id_jugador` | UUID FK a `jugadores`, obligatorio. |
| `cantidad_tokens` | Integer estrictamente positivo. |
| `cotizacion` | `numeric(14,2)` no negativa; snapshot exacto aplicado. |
| `importe_creditos` | `bigint` no negativo en unidades mínimas. |
| `tipo_estrategia` | Estrategia activa aplicada. |
| `id_version_estrategia` | UUID FK; versión del snapshot. |
| `id_recalculo` | UUID FK; corrida activa del snapshot. |
| `fecha_hora` | `timestamptz` de confirmación. |
| `creado_en` | `timestamptz`; no se actualiza. |

La clave de idempotencia se compara junto con comprador, jugador y cantidad. El valor persistido
es el header normalizado luego de recortar espacios laterales; no se guardan órdenes fallidas ni
estados intermedios.

### AuditoriaOrdenCompra — `auditorias_orden_compra`

| Campo | Tipo/regla |
|---|---|
| `id_auditoria` | UUID PK. |
| `id_operacion` | UUID FK a `ordenes_compra`, `UNIQUE`. |
| `id_usuario_comprador` / `id_usuario_vendedor` | UUID snapshot de las partes. |
| `id_jugador` | UUID snapshot del activo comprado. |
| `cantidad_tokens` | Integer positivo. |
| `cotizacion` | `numeric(14,2)` snapshot exacto. |
| `importe_creditos` | `bigint` snapshot exacto. |
| `tipo_estrategia` / `id_version_estrategia` | Snapshot de estrategia y versión. |
| `fecha_hora` | Fecha de confirmación. |
| `clave_idempotencia` | Clave que originó la operación. |

La tabla es append-only: triggers rechazan `UPDATE` y `DELETE`. La orden también es inmutable y
solo se inserta una vez.

## Reglas exactas

- `Idempotency-Key` es un header obligatorio y no forma parte del body.
- Se recortan espacios laterales antes de validar; luego debe tener entre 1 y 128 caracteres
  ASCII de `[A-Za-z0-9._~-]`.
- Espacios internos, controles, caracteres inválidos y valores vacíos se rechazan con `422` y no
  producen efectos.
- La restricción `UNIQUE`, el replay y la comparación de payload usan el valor normalizado.
- `cotizacion` se convierte desde `numeric::text` a `Cotizacion`.
- `importe_creditos = cotizacion.toUnidades() * BigInt(cantidad_tokens)`.
- La respuesta convierte `importe_creditos` con `Creditos.toDecimalString()` y `cotizacion` con
  `Cotizacion.toDecimalString()`.
- La suma de `cantidad_tokens` por jugador, calculada sobre `tokens`, permanece en 100.
- La suma de tenencias por jugador debe coincidir con el conteo de tokens por propietario.

## Transición confirmada

```text
request válido
  -> estrategia activa y cotización vigente bloqueadas
  -> saldo, tokens y tenencias validados y bloqueados
  -> tokens transferidos + saldos actualizados + tenencias actualizadas
  -> orden y auditoría insertadas
  -> commit
```

Cualquier error vuelve al estado anterior. Una orden ya confirmada solo puede transitar a
`respuesta idempotente`, nunca a una nueva transferencia.

## Migración e índices

`1790275843000-CreateOrdenesCompra.ts` crea ambas tablas después de tokens y tenencias, sus FK,
checks e índices por clave de idempotencia, jugador, comprador y fecha. `down` elimina primero la
auditoría, sus triggers y luego la orden. Los fixtures nuevos ejecutan esta migración después de
`CreateTenenciasJugador1790275842000`.
