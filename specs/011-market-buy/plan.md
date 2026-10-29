# Plan: Comprar tokens de jugador

**Rama**: `feat/compra-tokens` · **Fecha**: 2026-10-28 · **Spec**: [spec.md](spec.md)

## Resumen

Agregar `OrdersModule` con `POST /orders/buy`. El caso de uso reutiliza JWT, usuarios, saldo
exacto, tokens, tenencias y cotizaciones vigentes; ejecuta la compra en una única transacción
sobre `PLAYERS_DATA_SOURCE` y persiste una orden y su auditoría inmutables. No se agrega otro
datasource ni se modifican las operaciones de venta, portfolio, ranking, historial de operaciones
o frontend.

## Contexto técnico

**Lenguaje y versión**: TypeScript 5.7, Node.js 22.11, NestJS 11.

**Dependencias principales**: TypeORM 0.3, PostgreSQL 16, `class-validator`, Swagger/OpenAPI,
Jest 30, Supertest 7 y Testcontainers 11. Se reutilizan `JwtAuthGuard`, `Creditos`, `Cotizacion`,
`SaldoUsuario`, `TokenJugador`, `TenenciaJugador` y `PLAYERS_DATA_SOURCE`.

**Persistencia**: PostgreSQL existente. `PLAYERS_DATA_SOURCE` será la única conexión de la compra;
`UsersModule` seguirá atendiendo registro y login con su conexión actual, fuera de la transacción
de compra.

**Pruebas**: unitarias sin NestJS ni base de datos; integración con PostgreSQL 16 en Testcontainers;
HTTP con Supertest; contrato Swagger y colección Postman.

**Plataforma y tipo**: backend REST NestJS ejecutado con Node.js y PostgreSQL.

**Objetivo de rendimiento**: una petición síncrona para un jugador y como máximo 100 tokens,
manteniendo la latencia normal del backend; no se agrega un SLA nuevo.

**Restricciones**: importes en unidades enteras exactas; cotizaciones `numeric(14,2)` leídas como
texto y convertidas a `Cotizacion`; transacción única; clave de idempotencia única; no modificar
tests existentes; no usar historial ni otra estrategia como fallback.

**Alcance**: un endpoint, dos entidades append-only nuevas, una migración, un módulo de órdenes y
las pruebas/documentación asociadas.

## Constitution Check

- **Stack**: PASS. Se mantienen TypeScript, NestJS, PostgreSQL, TypeORM y REST.
- **Arquitectura en capas**: PASS. `OrdersController -> BuyOrderService -> domain/repository`;
  el controller no accede a persistencia.
- **Modelo rico**: PASS. La compra usa métodos de `SaldoUsuario`, `TokenJugador` y
  `TenenciaJugador`; la orden valida importe, snapshot e idempotencia en su dominio.
- **Validaciones por nivel**: PASS. DTO valida forma; `OrdersService` comprueba que existan los
  objetos requeridos, coordina la UoW y traduce ausencias técnicas; `OrdenCompra` y los objetos
  `SaldoUsuario`, `TokenJugador` y `TenenciaJugador` protegen la viabilidad e invariantes de
  negocio; el repository solo carga, bloquea y persiste.
- **Tests y protección**: PASS. Se agregan tests nuevos; no se edita ni elimina ningún test actual.
- **Definición de terminado**: PASS. Se incluyen build, unitarios, integración, Supertest, Swagger
  y Postman.
- **Idioma y nombres**: PASS. Documentación y errores en español; identificadores sin acentos ni ñ.
- **Operación transaccional**: PASS. Saldos, tokens, tenencias, orden y auditoría confirman o
  revierten juntos; locks determinísticos coordinan concurrencia.

**Gate**: PASS. No hay violaciones constitucionales que justificar.

## Estructura

### Artefactos de esta feature

```text
specs/011-market-buy/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── buy-order.md
```

`tasks.md` se genera en la fase posterior de tareas y debe conservar estas responsabilidades.

### Backend y verificaciones

```text
backend/src/orders/
├── orders.module.ts
├── orders.controller.ts
├── orders.service.ts
├── orders.repository.ts
├── pipes/
│   └── idempotency-key.pipe.ts
├── dto/
│   ├── buy-order.dto.ts
│   └── buy-order-response.dto.ts
├── domain/
│   └── orden-compra.ts
└── persistence/
    ├── orden-compra.entity.ts
    ├── auditoria-orden-compra.entity.ts
    └── typeorm-orders.repository.ts

backend/migrations/
└── 1790275843000-CreateOrdenesCompra.ts

backend/test/unit/orders/
├── orden-compra.spec.ts
├── idempotency-key.pipe.spec.ts
└── orders.service.spec.ts

backend/test/integration/orders/
├── orders-integration-app.ts
├── orders-repository.spec.ts
├── buy-order.spec.ts
├── buy-order-idempotency.spec.ts
├── quote-recalculation-concurrency.spec.ts
└── schema-constraints.spec.ts

backend/test/unit/documentation/
└── orders-openapi.spec.ts

docs/postman/
└── market-orders.postman_collection.json
```

### Decisiones de integración

- `OrdersModule` importa `AuthModule` y `PlayersModule`, usa `PLAYERS_DATA_SOURCE` y se registra
  en `AppModule`.
- `PlayersModule` agrega `SaldoUsuarioEntity`, `OrdenCompraEntity` y
  `AuditoriaOrdenCompraEntity` a la misma conexión que ya contiene usuarios, jugadores,
  cotizaciones, tokens y tenencias.
- `database/data-source.ts` registra las entidades nuevas para migraciones CLI.
- `CotizacionVigenteEntity` adopta el mismo transformer exacto de `HistorialCotizacionEntity`;
  las respuestas existentes del ranking continúan convirtiendo a número solo en su DTO actual.
- `UsersModule`, `AuthService`, `SuperadminBootstrapService`, `MarketInitializationService` y
  las entidades existentes se reutilizan sin crear equivalentes paralelos.

## Decisiones de diseño

### Arquitectura del caso de uso

1. `JwtAuthGuard` valida el Bearer y entrega `sub`; `IdempotencyKeyPipe`, aplicado
   declarativamente al header `Idempotency-Key`, exige el header, recorta espacios laterales,
   valida longitud/caracteres y devuelve el valor normalizado. `OrdersController` recibe el DTO y
   el header ya validado, sin trimming, regex, límites ni decisiones de negocio, y delega
   exclusivamente en `OrdersService`.
2. `OrdersService` abre la UoW y solicita al repository el comprador identificado por el JWT, el
   superadmin configurado, el jugador, la cotización vigente, los saldos, los tokens, las
   tenencias y la orden existente ya bloqueados. Si falta un objeto requerido, traduce la ausencia
   técnica al error de aplicación correspondiente; luego invoca `OrdenCompra` y solicita la
   persistencia del resultado. No decide reglas de compra.
3. `OrdenCompra` recibe esos objetos y ejecuta el comportamiento completo: valida comprador y
   vendedor, cantidad, cotización, importe, saldo, disponibilidad, tenencias e idempotencia;
   transfiere tokens, actualiza tenencias, debita/acredita saldos y produce un resultado inmutable.
   `SaldoUsuario`, `TokenJugador` y `TenenciaJugador` exponen métodos de dominio para proteger sus
   propias invariantes.
4. `TypeOrmOrdersRepository`, registrado bajo `ORDERS_REPOSITORY`, ofrece la UoW transaccional con
   locks, consultas, carga, mapeo y persistencia. No decide validez, no rechaza reglas de negocio
   y no expone métodos de actualización o eliminación de órdenes ni auditorías.

### Resolución de cotización vigente

El contrato interno `ActiveQuoteResolver` recibe `jugadorId` dentro de la unidad de trabajo y
devuelve un snapshot con `estrategia`, `idVersionEstrategia`, `idRecalculo`, `cotizacion` como
`Cotizacion` y `fechaHora`, o ausencia de snapshot cuando los datos no permiten resolverlo.

- Bloquea `recalculo_cotizacion_activo` con `id = 1` usando `FOR UPDATE`.
- Si la fila no existe, o `tipo_estrategia`/`id_recalculo` son nulos, devuelve ausencia de
  snapshot; `OrdersService` traduce esa ausencia técnica al error de aplicación correspondiente.
- Bloquea `cotizacion_vigente` por `(id_jugador, tipo_estrategia)` usando `FOR UPDATE` y lee
  `cotizacion::text`.
- Solo devuelve la fila si existe y su `id_recalculo` coincide exactamente con el puntero activo;
  ante una ausencia o desalineación devuelve ausencia de snapshot, sin decidir la validez de la
  compra.
- Convierte el texto con `Cotizacion.fromDecimal`. Nunca consulta `historial_cotizacion`, calcula
  una cotización ni busca otra estrategia.

El lock del puntero activo es compatible con el lock que ya usa el recálculo y garantiza que una
compra espera una estrategia/cotización coherentes antes de continuar.

### Transacción y orden de locks

Todas las operaciones se ejecutan mediante `DataSource.transaction`. El orden fijo es:

1. `pg_advisory_xact_lock(hashtextextended(Idempotency-Key-normalizado, 0))` para serializar el mismo
   reintento; la restricción única de la tabla sigue siendo la protección durable.
2. `recalculo_cotizacion_activo` y luego el jugador, ambos con `FOR UPDATE`.
3. La fila de `cotizacion_vigente` exacta de la estrategia activa, con `FOR UPDATE`.
4. Filas de `usuarios` de comprador y superadmin en orden ascendente de UUID, con `FOR UPDATE`.
5. Filas de `saldos_usuario` en el mismo orden, cuando existen. El repository entrega la ausencia
   al service; `OrdersService` la traduce al error de aplicación requerido. Un saldo del superadmin
   ausente puede representar saldo cero para que el dominio produzca el saldo acreditado solo tras
   una compra confirmada.
6. Tokens del superadmin para el jugador, ordenados por `numero_emision`, con `FOR UPDATE`; se
   seleccionan exactamente los primeros `cantidadTokens`.
7. Tenencias del comprador y superadmin en orden ascendente de UUID, con `FOR UPDATE`; las filas
   faltantes se entregan como ausencia al service. El service traduce la ausencia técnica y el
   dominio decide la consistencia de las tenencias que sí fueron cargadas.
8. `OrdersService` invoca el dominio después de las cargas bloqueadas; el repository persiste las
   mutaciones y el resultado inmutable. El commit confirma todo junto.

El lock del jugador impide que dos compras sobre el mismo jugador compitan por la misma emisión y
coordina la compra con la inicialización del mercado. Los errores PostgreSQL `40001` y `40P01` se
reintentan hasta tres veces desde el service; los errores de negocio no se reintentan.

### Verificación compra/recálculo concurrentes

`backend/test/integration/orders/quote-recalculation-concurrency.spec.ts` prepara la estrategia
activa y la cotización vigente iniciales, y ejecuta compra y recálculo sobre el mismo jugador con
una barrera controlada del test o un lock/advisory lock de coordinación, sin `sleep` ni esperas
arbitrarias. El escenario acepta que cualquiera confirme primero y verifica que la compra conserve
estrategia, versión, `idRecalculo`, cotización e importe del mismo snapshot; al final valida el
puntero activo, la operación persistida, una sola transferencia, suma de 100 tokens, tenencias
coherentes y saldos no negativos.

### Idempotencia, rollback y reintentos

- Una orden confirmada contiene la clave, comprador, jugador y cantidad de request.
- `Idempotency-Key` se recorta antes de validar; el valor normalizado debe tener 1–128 caracteres
  ASCII de `[A-Za-z0-9._~-]`. No forma parte del body, se persiste y compara normalizado, y un
  valor inválido se rechaza con `422` antes de abrir efectos de mercado.
- Una petición toma el lock transaccional de la clave y el repository carga una orden existente
  antes de cambiar el mercado. `OrdenCompra` compara clave, comprador, jugador y cantidad: si
  coincide produce el replay del snapshot persistido; si difiere produce el conflicto `409`.
- La clave también tiene índice `UNIQUE`, de modo que una colisión inesperada no puede duplicar la
  orden. La inserción de orden y auditoría es la última escritura lógica de la transacción.
- Cualquier excepción, incluyendo una falla de auditoría, revierte tokens, tenencias, saldos,
  orden y auditoría.
- Si el cliente pierde la respuesta después del commit, repite la misma clave y recibe el mismo
  resultado sin movimiento adicional.

## Mapa de implementación

| Área | Cambios concretos |
|---|---|
| HTTP | `orders.controller.ts`, `dto/`, `pipes/idempotency-key.pipe.ts`, `@Post('buy')`, `JwtAuthGuard`, Swagger, códigos `201/401/403/404/409/422`; el controller solo aplica declarativamente el pipe. |
| Service | `orders.service.ts`: comprobación de objetos requeridos, coordinación de UoW, invocación del dominio, retry de serialización y mapeo técnico de ausencias/errores. |
| Dominio | `orden-compra.ts` y métodos de `Creditos`, `Cotizacion`, `TokenJugador.transferirA`, `TenenciaJugador.actualizarCantidad`, `SaldoUsuario.debitar/acreditar`; todas las reglas de compra viven aquí. |
| Repository | `orders.repository.ts` y `typeorm-orders.repository.ts`: UoW, resolver de quote, locks, carga/mapeo, escritura exacta y persistencia append-only; sin reglas de negocio. |
| SQL/entidades | Migración `1790275843000-CreateOrdenesCompra.ts`, dos tablas nuevas, FK/UNIQUE/CHECK/índices y triggers que rechacen `UPDATE`/`DELETE`. |
| Módulos/datasource | `OrdersModule`, `AppModule`, `PlayersModule`, `database/data-source.ts`; agregar entidades al datasource existente. |
| Tests | Unitarios del dominio y `IdempotencyKeyPipe`; tests del Service para existencia, orquestación y mapeo; tests del repository para carga, locks y persistencia con Testcontainers; Supertest para header inválido sin efectos, constraints, OpenAPI y Postman; no editar specs existentes. |

## Riesgos y mitigaciones

- **Dos datasources**: usar `USER_REPOSITORY` rompería atomicidad; la compra leerá usuarios y
  saldos mediante el manager de `PLAYERS_DATA_SOURCE`.
- **Transformer actual de cotización vigente**: convertir `numeric` desde `text` a `Cotizacion`
  y conservar el número JSON solo en el contrato legacy del ranking.
- **Deadlocks**: puntero activo, usuario, saldo, token y tenencia se bloquean siempre en el orden
  documentado; reintentar solo `40001`/`40P01`.
- **Fallo después del commit**: la clave única y el snapshot de orden permiten replay seguro.
- **Tests existentes y fixtures explícitos**: crear helper de órdenes y nuevos tests/migraciones,
  sin modificar archivos de tests actuales.

## Verificaciones de salida

- Unitarias de dominio: cantidad, importe exacto, saldo, transferencia individual, tenencias,
  comprador distinto, quote ausente, estrategia ausente e idempotencia.
- Unitarias del pipe: `Idempotency-Key` ausente, vacío, espacios laterales/internos, longitud,
  caracteres inválidos y valor válido normalizado.
- Unitarias del Service: existencia de comprador/superadmin/jugador/quote/saldos/tokens/tenencias,
  orquestación de la UoW y mapeo de ausencias, sin reglas de viabilidad.
- PostgreSQL/Testcontainers del repository: carga, orden de locks, persistencia, compra parcial/total,
  saldo inicial cero del superadmin, quote activa frente a historial, rollback simulado, constraints
  append-only, reintento, concurrencia y carrera controlada compra/recálculo con snapshot completo.
- Supertest: `201`, `401`, `403`, `404`, `409`, `422`, response exacta y ausencia de efectos;
  `buy-order-idempotency.spec.ts` verifica un header inválido sin modificar tokens, tenencias,
  saldos, órdenes ni auditorías.
- Swagger/OpenAPI: ruta, Bearer, header `Idempotency-Key`, schemas y respuestas.
- Postman: login de usuario, compra, reintento con misma clave y aserciones de operación, saldo,
  tenencias y cantidad.
- `npm run build`, unitarios, integración y `git diff --check`; cualquier test existente debe
  permanecer sin cambios y pasar.

## Complexity Tracking

No aplica: la solución agrega un módulo, una migración y dos registros propios dentro de la
arquitectura existente; no crea un datasource ni duplica usuarios, saldos, tokens, tenencias o
cotizaciones.
