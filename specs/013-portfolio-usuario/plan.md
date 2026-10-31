# Implementation Plan: Portfolio de usuario

**Branch**: `013-portfolio-usuario` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

## Summary

Agregar `GET /users/:id/portfolio` mediante un módulo de lectura que reutilice
`PLAYERS_DATA_SOURCE`, `JwtAuthGuard`, `OwnershipService`, las entidades existentes y los value
objects exactos. El repository leerá todo el snapshot en una transacción PostgreSQL de solo
lectura; el dominio validará consistencia y calculará las posiciones.

No se agregan tablas, migraciones, escrituras ni endpoints de historial o de mercado.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 22.11, NestJS 11.

**Primary Dependencies**: TypeORM 0.3, PostgreSQL 16, `class-validator`, Swagger/OpenAPI,
Jest 30, Testcontainers 11 y Supertest 7. Se reutilizan `PLAYERS_DATA_SOURCE`, `JwtAuthGuard`,
`OwnershipService`, `Cotizacion` y `Creditos`.

**Storage**: PostgreSQL existente; solo lectura sobre `usuarios`, `tenencias_jugador`, `tokens`,
`recalculo_cotizacion_activo`, `cotizacion_vigente` y `transacciones_mercado`.

**Testing**: Tests unitarios sin NestJS ni base de datos; integración con PostgreSQL/Testcontainers;
HTTP con Supertest; contrato Swagger y request de Postman.

**Target Platform**: Backend REST NestJS.

**Project Type**: Servicio web.

**Performance Goals**: N/A. No se agrega SLA, caché ni optimización fuera de la lectura consistente.

**Constraints**: Una única transacción `REPEATABLE READ` y `READ ONLY`; sin punto flotante; no
usar cotizaciones históricas; no modificar tests existentes; no agregar esquema persistente.

**Scale/Scope**: Un endpoint y una vista calculada por usuario, ordenada por `idJugador`.

## Constitution Check

- **Stack**: PASS. Mantiene TypeScript, NestJS, PostgreSQL y REST.
- **Arquitectura**: PASS. `PortfolioController -> PortfolioService -> Portfolio domain /
  repository`; el Controller no accede a persistencia.
- **Modelo rico**: PASS. El cálculo, validación de tenencia y aritmética exacta viven en el
  dominio; no se agregan setters ni mutaciones.
- **Validaciones**: PASS. `ParseUUIDPipe` valida el path, `OwnershipService` autoriza, el
  Service verifica existencia y el dominio valida consistencia y cálculos.
- **Tests y protección**: PASS. Se agregan suites nuevas unitarias, de integración, HTTP y
  documentación; no se modifica ni elimina ningún test existente.
- **Definición de terminado**: PASS. El plan incluye compilación, tests, Swagger y Postman.
- **Idioma**: PASS. Documentación, DTOs y errores nuevos estarán en español; identificadores sin
  acentos ni ñ.
- **Solo lectura**: PASS. No se persiste estado y la transacción se declara `READ ONLY`.

**Gate**: PASS. No hay violaciones constitucionales que justificar.

## Project Structure

### Documentation

```text
specs/013-portfolio-usuario/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/portfolio.md
└── tasks.md                         # fase posterior
```

### Source Code

```text
backend/src/portfolio/
├── portfolio.module.ts
├── portfolio.controller.ts
├── portfolio.service.ts
├── portfolio.repository.ts
├── domain/portfolio.ts
├── dto/portfolio-response.dto.ts
└── persistence/typeorm-portfolio.repository.ts

backend/src/app.module.ts            # registrar PortfolioModule
backend/src/quotes/                  # compartir solo el lector de cotización activa si hace falta

backend/test/unit/portfolio/portfolio.spec.ts
backend/test/unit/documentation/portfolio-openapi.spec.ts
backend/test/integration/portfolio/portfolio.spec.ts
docs/postman/football-player-market.postman_collection.json
```

**Structure Decision**: Módulo `portfolio` separado. Aunque la ruta comienza con `users`, la
consulta combina datos de usuarios y mercado; el módulo importa `AuthModule` y `PlayersModule`,
consume `PLAYERS_DATA_SOURCE` y evita un ciclo entre `UsersModule` y `PlayersModule`. No agrega
entidades TypeORM ni modifica módulos de compra o venta salvo el registro del nuevo módulo en
`AppModule`.

## Design Decisions

### Flujo HTTP y autorización

1. `PortfolioController` usa `@Controller('users')`, `@Get(':id/portfolio')`,
   `@UseGuards(JwtAuthGuard)` y `ParseUUIDPipe` con error `422`.
2. Recibe solo `id` y `request.user.sub`; delega a `PortfolioService` y transforma el resultado
   con `PortfolioResponseDto`.
3. `PortfolioService` invoca `OwnershipService.assertOwner(sub, id)` antes de cualquier consulta.
   Si `id` no coincide con `sub`, responde `403` aunque ese UUID no exista. Solo después de pasar
   ownership se verifica la existencia del UUID propio y se traduce su ausencia a `404`; JWT
   ausente o inválido queda en `401` por el guard.

### Lectura consistente

`TypeOrmPortfolioRepository` usará `PLAYERS_DATA_SOURCE.transaction('REPEATABLE READ', ...)` y
ejecutará `SET TRANSACTION READ ONLY` antes de las consultas. En el mismo snapshot:

1. comprueba que `usuarios.id` exista;
2. lee la estrategia e `id_recalculo` de `recalculo_cotizacion_activo`;
3. lee tenencias positivas del usuario;
4. cuenta tokens individuales por `(usuario, jugador)`;
5. lee `cotizacion_vigente` solo para los jugadores del portfolio, la estrategia activa y el
   `id_recalculo` activo;
6. lee de `transacciones_mercado` únicamente filas `tipo = 'COMPRA'` del usuario y jugador.

No usa `FOR UPDATE`, no abre una UoW de compra y no ejecuta `INSERT`, `UPDATE`, `DELETE`,
`TRUNCATE` ni migraciones.

La regla de cotización vigente será la misma de `market-buy` y `market-sell`: estrategia activa,
fila por jugador/estrategia y `id_recalculo` alineado. Si la lógica actual está encapsulada en
órdenes, se extraerá solo el lector común; no se cambiará el comportamiento de compra ni venta.

### Dominio y cálculos

`Portfolio.calcular` recibirá un read model con tenencias, conteos de tokens, cotizaciones y
compras. Para cada tenencia positiva, en orden de `idJugador`:

- rechaza con error de dominio una diferencia entre tenencia y tokens individuales;
- rechaza con error de dominio la ausencia de la cotización activa;
- calcula el promedio con `sum(cantidadCompra × cotizacionCompra) / sum(cantidadCompra)`;
- calcula `costoDeAdquisicion = cantidadTenencia × precioPromedioCompra`;
- calcula `valorActual = cantidadTenencia × cotizacionVigente`;
- calcula `gananciaPerdida = valorActual − costoDeAdquisicion`;
- representa promedio y ganancia sin compras como `null`.

Los numeradores, denominadores, costo de adquisición y resultados intermedios usarán
`bigint`/value objects exactos, sin redondear durante las operaciones. El promedio, el costo y la
ganancia se redondean half-up a dos posiciones únicamente al serializar la respuesta; `Cotizacion`
y `Creditos` conservan la representación existente.

### Errores HTTP

- `401`: responsabilidad de `JwtAuthGuard`.
- `403`: `OwnershipService` cuando el `sub` no coincide con el path, incluso si ese UUID no existe.
- `404`: `PortfolioService` únicamente cuando no existe el UUID propio del usuario autenticado.
- `409`: error de dominio por tenencia inconsistente o cotización activa ausente/alineada de forma
  inválida.
- `422`: `ParseUUIDPipe` para un UUID inválido.

El Controller no captura ni decide estos casos; el Service traduce únicamente errores de dominio
conocidos a excepciones HTTP y conserva el filtro global existente.

### DTO y contrato

`PortfolioResponseDto` contendrá `usuarioId` y `posiciones`; `PortfolioPositionResponseDto`
contendrá `idJugador`, `cantidadTokens`, `cotizacionVigente`, `precioPromedioCompra`,
`valorActual` y `gananciaPerdida`. Los importes serán strings `^-?\\d+\\.\\d{2}$`, con promedio
y ganancia anulables cuando no haya compras.

Swagger documentará Bearer, el path UUID, `200`, `401`, `403`, `404`, `409` y `422`. El contrato
detallado queda en [contracts/portfolio.md](contracts/portfolio.md).

### Tests y documentación

- Unitarios: `Portfolio.calcular` para promedio ponderado, exactitud, signos, ausencia de compras,
  portfolio vacío y desalineación de tokens.
- Integración y HTTP: reutilizar `createOrdersIntegrationApp` y su Testcontainer/migraciones
  existentes, agregando solo `backend/test/integration/portfolio/portfolio.spec.ts`. El archivo
  debe cubrir acceso autorizado, ownership, UUID/usuario inexistente, portfolio vacío, cálculos,
  cotización faltante, tenencia inconsistente, cotización activa frente a histórica y snapshots
  sin escrituras.
- Swagger: nuevo test unitario aislado del Controller, como los contratos de órdenes existentes.
- Postman: agregar variable `userId` y una request autenticada de portfolio con tests de status,
  orden y tipos; no alterar requests de compra/venta.

## Post-Design Constitution Check

- **PASS**: no hay tablas ni migraciones nuevas y todos los accesos persistentes son de lectura.
- **PASS**: el Controller delega; Service autoriza y orquesta; dominio calcula; repository consulta.
- **PASS**: se usa aritmética exacta y solo la cotización vigente de la estrategia activa.
- **PASS**: se agregan tests nuevos con PostgreSQL/Testcontainers y Supertest sin tocar tests
  existentes.
- **PASS**: Swagger y Postman se actualizan para el endpoint nuevo.

## Complexity Tracking

No aplica: el diseño no introduce violaciones ni componentes fuera del alcance.
