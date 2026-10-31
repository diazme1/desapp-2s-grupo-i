# Plan de implementación: Venta de tokens de jugador

**Rama**: `012-market-sell` | **Fecha**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

## Resumen

Agregar `POST /orders/sell` reutilizando autenticación, cotización vigente, tokens,
tenencias, idempotencia y la unidad transaccional de `market-buy`. La venta transfiere
tokens del usuario al superadmin, acredita al usuario y registra una operación común de
tipo `VENTA` junto con su auditoría.

La persistencia de compras y ventas se unifica en `transacciones_mercado`. La migración
debe conservar las compras y auditorías ya existentes. El saldo del superadmin se manejará
con representación exacta con signo; los saldos de usuarios comunes seguirán sin poder
quedar negativos.

La regla de saldo de la venta es explícita: la operación se rechaza únicamente cuando el
saldo del usuario común vendedor es insuficiente. Nunca se valida ni se exige saldo disponible
del superadmin. El saldo del superadmin puede no existir, ser cero o quedar negativo; toda venta
válida acredita al usuario y debita al superadmin por el importe exacto.

## Contexto técnico

**Lenguaje**: TypeScript 5.7 sobre Node 22.

**Dependencias**: NestJS 11, TypeORM 0.3, PostgreSQL, class-validator, Swagger, Jest,
Supertest y Testcontainers.

**Persistencia**: PostgreSQL mediante `PLAYERS_DATA_SOURCE`, compartido con usuarios,
jugadores, cotizaciones, tokens y tenencias.

**Pruebas**: Jest; unitarias sin NestJS ni base de datos; integración con PostgreSQL real;
HTTP con Supertest.

**Tipo de proyecto**: API REST NestJS.

**Restricciones**:

- El Controller solo recibe, aplica DTO/pipe y delega.
- El Service comprueba existencias, coordina la UoW y mapea errores técnicos.
- El dominio ejecuta las reglas de venta, transferencia, saldos, tenencias e idempotencia.
- Los repositories solo cargan, bloquean y persisten.
- No se eliminan tests. Se adaptan únicamente los tests existentes de `market-buy` que consultan
  las tablas reemplazadas; los tests ajenos a Mercado permanecen sin cambios.

## Control de Constitución

- **Capas**: PASS. Se conserva `Controller -> Service -> Domain / Repository`.
- **Modelo rico**: PASS. La operación se implementa en un modelo de venta; no se asignan
  campos directamente desde el Service.
- **Validaciones**: PASS. DTO/pipe valida forma; Service comprueba existencia; dominio
  protege invariantes.
- **Atomicidad**: PASS. Tokens, tenencias, saldos, transacción y auditoría se confirman en
  una única UoW.
- **Exactitud**: PASS. Cotizaciones e importes usan value objects y unidades enteras.
- **Auditoría**: PASS. Las operaciones confirmadas son inmutables y la auditoría es
  append-only.
- **Excepción explícita**: la venta solo valida saldo suficiente del usuario común vendedor;
  nunca exige saldo disponible del superadmin. El superadmin puede tener saldo inexistente,
  cero o negativo. La diferencia se protege en el dominio y mediante un trigger de integridad
  persistente, sin permitir saldo negativo arbitrario en cuentas comunes.

## Estructura de la feature

```text
specs/012-market-sell/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/sell-order.md
└── tasks.md

backend/src/orders/
├── orders.controller.ts
├── orders.service.ts
├── orders.repository.ts
├── dto/
├── domain/
└── persistence/

backend/migrations/
└── 1790275844000-CreateTransaccionesMercado.ts

backend/test/unit/orders/
backend/test/integration/orders/
backend/test/unit/documentation/
docs/postman/market-orders.postman_collection.json
```

## Diseño

### 1. Caso de uso

Agregar `OrdersService.vender(usuarioId, input, idempotencyKey)` y un modelo de dominio
específico para la venta. El Service cargará usuario vendedor, superadmin, jugador,
cotización activa, saldos, tokens, tenencias y transacción existente dentro de la UoW.

El dominio debe:

1. exigir que el vendedor sea un usuario común;
2. exigir que el comprador sea el superadmin;
3. resolver replay o conflicto de idempotencia;
4. calcular el importe exacto con la cotización vigente;
5. seleccionar tokens del vendedor en orden determinista;
6. transferirlos al superadmin;
7. restar y sumar las tenencias;
8. acreditar al usuario y debitar al superadmin sin límite inferior;
9. producir el snapshot inmutable de tipo `VENTA`.

En materia de saldos, el dominio debe rechazar únicamente el saldo insuficiente del usuario
común vendedor. Debe acreditar al usuario y debitar al superadmin el importe exacto sin consultar
ni exigir créditos disponibles del superadmin.

### 2. Contrato HTTP

Agregar `POST /orders/sell` en `OrdersController` con el mismo DTO, pipe, autenticación,
header, respuesta y reglas de error que `POST /orders/buy`. El Controller no incorporará
trimming, regex, decisiones de saldo ni reglas de negocio.

La respuesta mantendrá la forma existente: `idComprador` será el superadmin e `idVendedor`
será el usuario autenticado.

### 3. Persistencia común

Reemplazar la dependencia de `ordenes_compra` por `transacciones_mercado`, con `tipo` limitado
a `COMPRA` y `VENTA`. La migración deberá:

- crear la tabla común y su auditoría común;
- copiar las compras y auditorías existentes con `tipo = COMPRA`;
- conservar claves, snapshots y fechas;
- crear índices, FKs, unicidad de idempotencia y protección append-only;
- retirar las tablas anteriores únicamente después de copiar sus datos.

La persistencia común no debe introducir un sistema genérico de eventos ni nuevos tipos de
operación fuera de compra y venta.

### 4. Saldos exactos

Mantener `Creditos` no negativo para cotizaciones e importes. Para el saldo persistido,
introducir el value object exacto con signo `SaldoExacto` y adaptar
`SaldoUsuario` para que:

- permita saldo negativo solo cuando el usuario tenga rol `superadmin`;
- rechace saldo negativo para usuarios comunes;
- mantenga unidades enteras y representación decimal exacta;
- permita crear el saldo del superadmin durante una venta si no existe.

La migración debe reemplazar o adaptar el `CHECK` global actual de `saldos_usuario` que impide
todo saldo negativo. PostgreSQL debe crear el trigger de integridad
`trg_saldos_usuario_rol_integridad` sobre `saldos_usuario` que,
antes de insertar o actualizar `creditos_disponibles`, consulte el rol del usuario relacionado:
si `creditos_disponibles < 0` y el rol no es `superadmin`, debe rechazar la escritura con un
error de integridad; para el superadmin debe permitirla. El dominio conserva la misma regla y el
trigger actúa como protección persistente complementaria, no como reemplazo del modelo.

### 5. Unidad de trabajo y locks

Reutilizar `PLAYERS_DATA_SOURCE`, el resolver de cotización activa y el máximo de tres
reintentos para `40001` y `40P01`. Mantener un orden único de locks:

1. clave de idempotencia;
2. estrategia activa, jugador y cotización vigente;
3. usuarios y saldos ordenados por UUID;
4. tokens del vendedor del jugador, ordenados por `numero_emision`;
5. tenencias de vendedor y superadmin;
6. persistencia de tokens, saldos, tenencias, transacción y auditoría.

La venta y la compra deben usar el mismo orden para evitar deadlocks. La cotización aplicada
debe coincidir con el snapshot activo y nunca debe obtenerse del historial como fallback.

### 6. Adaptación de compra

La adaptación de `buy` a la tabla común debe conservar su contrato HTTP y su comportamiento.
No se crearán endpoints adicionales ni se cambiará la semántica de las compras. Se actualizarán
los tests existentes de `market-buy` que consultan `ordenes_compra` o
`auditorias_orden_compra` para consultar las tablas comunes; no se eliminará cobertura ni se
modificarán tests ajenos a Mercado.

## Validación prevista

- Unitarias del dominio de venta, saldo con signo, transferencia, tenencias e idempotencia.
- Tests del Service para existencias, orquestación, reintentos y mapeo de errores.
- Integración PostgreSQL/Testcontainers para migración de datos existentes, venta parcial y
  total, saldo negativo permitido al superadmin, saldo negativo rechazado para usuarios comunes,
  venta válida sin saldo suficiente del superadmin, rollback, concurrencia compra/venta y
  recálculo. También debe verificar el trigger de integridad y el reemplazo del `CHECK` global.
- HTTP con Supertest para `201`, `401`, `403`, `404`, `409` y `422`.
- Swagger/OpenAPI y Postman actualizados para ambos endpoints.
- `npm run build`, tests unitarios, tests de integración, lint y `git diff --check`. Los tests de
  compra adaptados y los nuevos de venta deben pasar; ningún test ajeno a Mercado debe cambiar.

## Complejidad justificada

| Decisión | Motivo | Alternativa descartada |
|---|---|---|
| Migrar a una tabla común | Fue solicitado para concentrar compras y ventas y evitar dos historiales | Crear `ordenes_venta` separada duplicaría el modelo y dejaría dos fuentes de verdad |
| Saldo con signo para superadmin | Permite recomprar siempre y conserva el débito contable | Saldo ilimitado no persistido perdería trazabilidad financiera |
| Modelo de venta separado con persistencia común | Mantiene las reglas de compra y venta explícitas sin crear un framework genérico | Un único modelo polimórfico haría más difícil preservar invariantes específicas |
