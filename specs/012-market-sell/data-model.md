# Modelo de datos: venta de tokens

## Entidades reutilizadas

- `Usuario`: vendedor común autenticado y comprador superadmin.
- `TokenJugador`: tokens individuales transferibles.
- `TenenciaJugador`: cantidad agregada por usuario y jugador.
- `SaldoUsuario`: saldo exacto del usuario; el superadmin puede tener saldo negativo.
- `CotizacionVigente` y `RecalculoCotizacionActivo`: fuente exclusiva del precio aplicado.

## TransaccionMercado — `transacciones_mercado`

| Campo | Regla |
|---|---|
| `id_operacion` | UUID, PK, inmutable |
| `tipo` | `COMPRA` o `VENTA` |
| `clave_idempotencia` | Normalizada, 1–128 caracteres, UNIQUE |
| `id_usuario_comprador` | FK a `usuarios` |
| `id_usuario_vendedor` | FK a `usuarios` |
| `id_jugador` | FK a `jugadores` |
| `cantidad_tokens` | Entero positivo |
| `cotizacion` | `numeric(14,2)` no negativa |
| `importe_creditos` | `bigint` en unidades mínimas, no negativo |
| `tipo_estrategia` | Estrategia aplicada |
| `id_version_estrategia` | FK al snapshot de versión |
| `id_recalculo` | FK al recálculo aplicado |
| `fecha_hora` / `creado_en` | Fechas de confirmación |

Para `VENTA`, el comprador es el superadmin y el vendedor es el usuario autenticado. Para
`COMPRA`, se conserva la relación ya existente.

## AuditoriaTransaccion — `auditorias_transaccion`

Contiene el snapshot inmutable de la operación, sus partes, jugador, cantidad, cotización,
importe, estrategia, versión, recálculo, fecha y clave de idempotencia. Tiene una relación
única con `transacciones_mercado` y triggers que rechazan `UPDATE` y `DELETE`.

## Saldo exacto

Los importes siguen usando unidades mínimas enteras. `SaldoUsuario` debe distinguir:

- usuario común: saldo `>= 0`;
- superadmin: saldo con signo, sin límite inferior.

La venta se rechaza únicamente si el saldo del usuario común vendedor es insuficiente. Nunca se
valida ni se exige saldo disponible del superadmin: su saldo puede no existir, ser cero o quedar
negativo. Una venta válida siempre acredita al usuario y debita al superadmin por el importe
exacto.

### Protección persistente del saldo

PostgreSQL debe proteger la misma invariante mediante el trigger de integridad
`trg_saldos_usuario_rol_integridad` sobre `saldos_usuario`. Antes de cada `INSERT` o `UPDATE` que deje `creditos_disponibles < 0`, el
trigger debe consultar el rol del usuario relacionado por `id_usuario` y rechazar con un error de
integridad cualquier saldo negativo cuyo rol no sea `superadmin`. Para el superadmin debe permitir
el saldo negativo.

La migración debe reemplazar o adaptar el `CHECK` global actual que impide todo saldo negativo;
el trigger pasa a ser la protección persistente diferenciada por rol. `SaldoUsuario` y su value
object deben conservar la misma regla en el dominio: el trigger es complementario y no reemplaza
las invariantes ni las validaciones del modelo.

La migración y los tests deben comprobar que la excepción no permite saldo negativo a usuarios
comunes. La ausencia inicial del saldo del superadmin se interpreta como cero y se crea dentro
de la venta confirmada.

## Transición de una venta

```text
request válido
  -> cotización activa bloqueada
  -> usuario, superadmin, saldos, tokens y tenencias bloqueados
  -> tokens transferidos al superadmin
  -> tenencias actualizadas
  -> usuario acreditado y superadmin debitado
  -> transacción y auditoría insertadas
  -> commit
```

Cualquier error revierte todos los cambios.

## Migración

La nueva migración debe crear las tablas comunes, copiar los registros de compra existentes
con `tipo = COMPRA`, copiar sus auditorías y luego retirar las tablas específicas anteriores.
Debe conservar FKs, unicidad de idempotencia, índices por jugador/fecha y protección
append-only. También debe retirar o adaptar el `CHECK` global de `saldos_usuario`, crear el
trigger de integridad por rol y dejar pruebas PostgreSQL/Testcontainers para saldo negativo
permitido al superadmin, rechazado para usuarios comunes y venta válida sin saldo suficiente del
superadmin.
