# Research: Historial de operaciones de Mercado

## Decisiones

### 1. Módulo de lectura paralelo a `portfolio`

- **Decisión**: agregar un módulo `transactions` con Controller, Service, Repository y DTO propio;
  reutilizar los tipos de transacción y aritmética existentes en vez de crear un dominio paralelo.
- **Evidencia**: `backend/src/market/portfolio/` ya implementa `Controller -> Service -> Repository`,
  reutiliza `AuthModule`/`PlayersModule` y aplica `OwnershipService` en el Service.
- **Racional**: mantiene el alcance separado de la valorización del portfolio y evita que un
  endpoint de historial herede cálculos o datos no solicitados, sin agregar una capa innecesaria.
- **Alternativa descartada**: extender `PortfolioController`/`PortfolioService`; mezclaría dos
  casos de uso con contratos y reglas distintas.

### 2. Read model desde `transacciones_mercado`

- **Decisión**: usar la fuente `PLAYERS_DATA_SOURCE` y una consulta parametrizada de solo lectura
  sobre `transacciones_mercado`, verificando primero la existencia del usuario y enriqueciendo
  únicamente `nombreCompleto` desde `jugadores.nombre_completo`.
- **Evidencia**: `TypeOrmPortfolioRepository` abre `REPEATABLE READ`, ejecuta `SET TRANSACTION
  READ ONLY` y devuelve un read model; `TransaccionMercadoEntity` y su migración ya definen los
  campos y los índices por comprador/vendedor y fecha.
- **Racional**: garantiza una vista consistente y no requiere entidades, tablas ni migraciones
  nuevas.
- **Consulta**: filtrar `id_usuario_comprador = $1 OR id_usuario_vendedor = $1` y ordenar por
  `fecha_hora DESC, id_operacion ASC`.
- **Alternativa descartada**: consultar cotizaciones, portfolio o auditoría; no representan el
  snapshot público solicitado y podrían introducir datos duplicados o recalculados.

### 3. Proyección pública y aritmética exacta

- **Decisión**: cargar `cotizacion` como texto decimal y `importe_creditos` como `bigint`, mapear
  mediante `Cotizacion.fromDecimal` y `Creditos.fromUnidades(...).toDecimalString()`, y proyectar
  solo `idOperacion`, `tipo`, `idJugador`, `nombreCompleto`, `cantidadTokens`, `cotizacion`,
  `importe` y `fechaHora`.
- **Evidencia**: `backend/src/market/domain/cotizacion.ts`, `creditos.ts` y los mappers de
  `TypeOrmOrdersRepository` ya usan estas representaciones; el contrato de órdenes confirma
  strings monetarios con dos posiciones.
- **Racional**: conserva el snapshot persistido, evita punto flotante y excluye clave de
  idempotencia, comprador, vendedor, estrategia, versión y `idRecalculo` del contrato público.
- **Alternativa descartada**: reutilizar directamente el response mapper de órdenes; expone
  precisamente metadatos internos que esta consulta debe ocultar.

### 4. Autorización y errores

- **Decisión**: proteger el Controller con `JwtAuthGuard`, validar el path con `ParseUUIDPipe` y
  delegar ownership a `OwnershipService` antes de consultar el Repository. Un usuario inexistente
  solo devuelve `404` después de validar que el UUID solicitado coincide con el `sub` autenticado.
- **Evidencia**: `PortfolioController`/`PortfolioService` implementan el mismo orden y mensajes
  de ownership; `JwtAuthGuard` ya produce `401`.
- **Racional**: evita filtraciones de existencia y mantiene consistencia con `/portfolio`.
- **Alternativa descartada**: autorizar en la consulta SQL o en el Controller; violaría la
  separación de responsabilidades.

### 5. Verificación y documentación

- **Decisión**: agregar unit tests para la proyección, integración con el helper de órdenes que
  levanta PostgreSQL/Testcontainers y HTTP con Supertest; agregar prueba OpenAPI y una carpeta de
  historial en la colección Postman existente.
- **Evidencia**: `backend/test/integration/market/orders/orders-integration-app.ts` ya registra la
  migración `CreateTransaccionesMercado1790275844000`; portfolio cuenta con pruebas unitarias,
  de integración y OpenAPI; la colección Postman ya tiene una carpeta de portfolio.
- **Racional**: prueba el acceso real a ambas partes de la transacción, la lectura sin escritura,
  los errores y el contrato sin modificar tests existentes.
