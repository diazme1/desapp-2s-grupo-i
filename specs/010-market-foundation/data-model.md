# Modelo de datos: Fundamentos del mercado de jugadores

## Convenciones de exactitud

- Los saldos usan unidades mínimas enteras con escala 2: `1 crédito = 100 unidades`.
- `10.000,00 créditos = 1.000.000 unidades`.
- Las cantidades de tokens son enteros.
- Las cotizaciones usan el value object `Cotizacion`, basado en unidades mínimas enteras
  (`bigint`) con escala 2: `1.00 = 100` unidades y `83.75 = 8375` unidades.
- Las cotizaciones se persisten en PostgreSQL como `numeric(14,2)`. El transformer recibe el
  texto decimal exacto de `pg`, lo convierte a `Cotizacion` y escribe el formato decimal
  canónico del value object; no utiliza `Number(...)` como representación del dominio.
- El contrato HTTP histórico conserva su representación numérica actual únicamente como
  presentación del DTO. Ese número JSON no vuelve al dominio ni se usa para cálculos
  financieros.

## Cotizacion

Value object de dominio para representar cualquier valor de cotización sin punto flotante.

| Operación | Regla |
|---|---|
| `fromUnidades(unidades)` | Recibe `bigint` no negativo; `100n` representa `1.00`. |
| `fromDecimal(texto)` | Acepta decimal explícito con hasta dos posiciones; rechaza signo negativo, exponentes, más de dos decimales, texto vacío y valores fuera de `numeric(14,2)`. |
| `toDecimalString()` | Devuelve el valor canónico con exactamente dos posiciones para persistencia y contratos internos. |
| `compareTo(otra)` | Compara unidades enteras sin convertir a `number`. |
| Presentación DTO | El DTO convierte `toDecimalString()` al número JSON requerido por el contrato existente; esta conversión no forma parte del value object y no puede utilizarse en dominio, services ni escrituras. |

El recorrido exacto es `numeric(14,2)` textual de PostgreSQL → `Cotizacion` → texto decimal
canónico. La apertura utiliza `Cotizacion.fromUnidades(100)` y se persiste como `1.00`.

## Usuario existente

Tabla: `usuarios`.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | UUID | PK, estable. |
| `correo` | Texto | Obligatorio, normalizado, único. |
| `password_hash` | Texto | Obligatorio; nunca contiene la contraseña original. |
| `rol` | Texto | `usuario` o `superadmin`; se reutiliza el constraint existente. |
| `creado_en` | Fecha/hora | Obligatoria. |

La feature no agrega roles ni cambia el bootstrap del superusuario.

## SaldoUsuario

Tabla: `saldos_usuario`.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id_usuario` | UUID | PK y FK a `usuarios(id)` con `ON DELETE RESTRICT`. |
| `creditos_disponibles` | Entero grande | Unidades mínimas, no negativo. `1.000.000` para un usuario nuevo. |
| `creado_en` | Fecha/hora | Obligatoria. |
| `actualizado_en` | Fecha/hora | Obligatoria; cambia al modificar el saldo en features futuras. |

### Invariantes

- Existe como máximo una fila por usuario.
- El registro público crea usuario y saldo en la misma transacción.
- Usuarios existentes durante la migración reciben saldo cero, sin crédito retroactivo.
- El superusuario creado por el bootstrap no recibe una carga especial en esta feature.

## TokenJugador

Tabla: `tokens`.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id_token` | UUID | PK, único y estable; identifica un token individual. |
| `id_jugador` | UUID | FK a `jugadores(id)` con `ON DELETE RESTRICT`. |
| `id_usuario_owner` | UUID | FK a `usuarios(id)` con `ON DELETE RESTRICT`; propietario actual. |
| `numero_emision` | Entero pequeño | Obligatorio, entre 1 y 100. |
| `id_lote_emision` | UUID | Identifica la emisión inicial común del jugador. |
| `emitido_en` | Fecha/hora | Obligatoria; momento de la emisión. |
| `actualizado_en` | Fecha/hora | Obligatoria; permite saber cuándo cambió el propietario en features futuras. |

### Invariantes

- `UNIQUE (id_jugador, numero_emision)`.
- Para cada jugador inicializado existen exactamente los números 1 a 100.
- No existe ningún campo de precio, cotización, valor actual o precio promedio.
- La reejecución nunca cambia `id_usuario_owner`.

## TenenciaJugador

Tabla: `tenencias_jugador`.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id_tenencia` | UUID | PK. |
| `id_usuario` | UUID | FK a `usuarios(id)` con `ON DELETE RESTRICT`. |
| `id_jugador` | UUID | FK a `jugadores(id)` con `ON DELETE RESTRICT`. |
| `cantidad_tokens` | Entero | Entre 0 y 100. |
| `creado_en` | Fecha/hora | Obligatoria. |
| `actualizado_en` | Fecha/hora | Obligatoria. |

### Invariantes

- `UNIQUE (id_usuario, id_jugador)`.
- Para cada jugador, la suma de tenencias coincide con 100.
- Cada cantidad coincide con el conteo de `tokens.id_token` agrupado por
  `id_usuario_owner`.
- Los checks SQL protegen rango y unicidad; la igualdad con tokens se valida y mantiene en
  la misma transacción del caso de uso.

## Cotizacion / HistorialCotizacion existente

Tabla: `historial_cotizacion`.

Las cotizaciones calculadas actuales conservan sus referencias obligatorias. Se agrega una
variante de apertura:

| Campo | Cotización calculada | Apertura `apertura_mercado` |
|---|---|---|
| `cotizacion` | `Cotizacion` no negativa, persistida como `numeric(14,2)` | `Cotizacion.fromUnidades(100)`, persistida exactamente como `1.00`. |
| `tipo_estrategia` | Estrategia existente | `apertura_mercado`. |
| `id_version_estrategia` | UUID/versionado | UUID estable de la versión de apertura. |
| `id_recalculo` | UUID obligatorio | `NULL`; no hubo recálculo. |
| `id_estadistica` | FK obligatoria | `NULL`; no se inventa estadística. |

La migración agrega:

- nulabilidad controlada para `id_recalculo` e `id_estadistica`;
- un check que permite `NULL` únicamente en filas `apertura_mercado`;
- un check de `cotizacion = 1.00` para la apertura, equivalente a `100` unidades en `Cotizacion`;
- un índice único parcial por `id_jugador` para `tipo_estrategia = 'apertura_mercado'`.

La FK de `id_estadistica` se conserva cuando el valor no es nulo. El endpoint de historial
mantiene su ruta y paginación; sus campos `idRecalculo` e `idEstadistica` pueden ser nulos
solo para una apertura.

## Transaccion futura (no implementada)

No se crea la tabla en esta feature. Las futuras transacciones deberán referenciar usuario,
jugador/token, saldo afectado e importe exacto, conservar una clave de idempotencia y ser
append-only. No son necesarias para registrar usuarios ni emitir el suministro inicial.

## Relaciones

```text
Usuario 1 ─── 1 SaldoUsuario
Usuario 1 ─── N TokenJugador (propietario actual)
Jugador 1 ─── N TokenJugador
Usuario N ─── N Jugador mediante TenenciaJugador
Jugador 1 ─── N HistorialCotizacion
```

## Transiciones de inicialización

```text
Jugador sin emisión
  ├─ 0 tokens -> emitir 1..100 + tenencia superadmin=100 + apertura 1.00
  ├─ 100 tokens válidos -> validar tenencias/apertura y no modificar propietarios
  └─ otra cantidad o referencias inválidas -> abortar y revertir la transacción
```

La inicialización bloquea jugadores en orden estable, por lo que dos ejecuciones concurrentes
no pueden confirmar dos emisiones para el mismo jugador.
