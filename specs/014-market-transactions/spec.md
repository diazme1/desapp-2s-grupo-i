# Feature Specification: Historial de operaciones de Mercado

**Feature Branch**: `014-market-transactions`

**Created**: 2026-11-01

**Status**: Draft

**Input**: Especificar `market-transactions` para implementar `GET /users/:id/transactions`,
permitiendo que un usuario autenticado consulte únicamente su historial propio de compras y
ventas, reutilizando las transacciones de Mercado existentes y sin modificar operaciones
persistidas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el historial propio (Priority: P1)

Como usuario autenticado, quiero consultar mis operaciones de compra y venta para conocer qué
operé, sobre qué jugador, a qué cotización, por qué importe total y cuándo se realizó.

**Why this priority**: El historial brinda trazabilidad de la actividad financiera sin alterar
el estado actual del Mercado.

**Independent Test**: Preparar en el Mercado operaciones `COMPRA` y `VENTA` pertenecientes al
usuario, invocar el endpoint propio y verificar que la respuesta contiene los snapshots
persistidos completos en un orden determinista.

**Acceptance Scenarios**:

1. **Given** que el usuario autenticado tiene compras y ventas persistidas, **When** consulta
   `/users/{idPropio}/transactions`, **Then** recibe `200` con cada operación, su tipo, `idJugador`,
   `nombreCompleto` del jugador, `cantidadTokens`, `cotizacion`, `importe` total e `fechaHora` de
   realización.
2. **Given** operaciones con fechas diferentes o iguales, **When** consulta el historial,
   **Then** las recibe de la más reciente a la más antigua por `fechaHora`, usando `idOperacion`
   como desempate estable.
3. **Given** un usuario existente sin operaciones, **When** consulta su historial, **Then** recibe
   `200` con `operaciones: []` y no un error `404`.

### User Story 2 - Proteger la privacidad y la inmutabilidad (Priority: P1)

Como usuario, quiero que el endpoint revele solo mi historial y sea una consulta de lectura para
que nadie pueda consultar operaciones ajenas ni modificar registros del Mercado.

**Why this priority**: Las operaciones contienen información financiera y sus snapshots deben
permanecer auditables e inmutables.

**Independent Test**: Invocar la ruta con credenciales ausentes, inválidas, propias y ajenas, y
comparar un snapshot de las tablas de Mercado antes y después de consultas exitosas y rechazadas.

**Acceptance Scenarios**:

1. **Given** un JWT ausente, inválido o vencido, **When** se consulta el endpoint, **Then** responde
   `401` sin exponer operaciones.
2. **Given** un JWT válido cuyo usuario no coincide con `{id}`, **When** se consulta la ruta,
   **Then** responde `403`, incluso si el UUID solicitado no existe.
3. **Given** un JWT cuyo `sub` coincide con un UUID propio pero ese usuario no existe, **When** se
   consulta la ruta, **Then** responde `404`.
4. **Given** una consulta autorizada, **When** se ejecuta una o varias veces, **Then** no cambia
   ninguna operación, auditoría, tenencia, token, saldo ni cotización persistida.

### Edge Cases

- Un `id` que no es UUID válido responde `422`.
- La ausencia de historial devuelve una lista vacía; no crea una operación ni una fila auxiliar.
- Una operación se considera del usuario si este figura como comprador o vendedor en la
  transacción común; `COMPRA` y `VENTA` se devuelven según el tipo persistido.
- `cotizacion` es la cotización aplicada al momento de la operación, no la vigente ni una
  cotización histórica consultada nuevamente.
- Si una fila persistida no puede representarse respetando sus invariantes o el contrato, la
  consulta responde `409` sin devolver una lista parcial ni modificar datos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST exponer únicamente `GET /users/:id/transactions`, protegido por la
  autenticación existente, y permitir que una identidad consulte solo el historial asociado a su
  propio `id`.
- **FR-002**: El sistema MUST validar `{id}` como UUID y aplicar los errores documentados: `401`
  para autenticación ausente o inválida, `403` para ownership ajeno, `404` para el usuario propio
  inexistente y `422` para un UUID inválido. La validación de ownership MUST ocurrir antes de
  revelar si un UUID ajeno existe.
- **FR-003**: El sistema MUST consultar exclusivamente la tabla existente `transacciones_mercado`
  para obtener todas las operaciones y sus snapshots, considerando las filas donde el usuario sea
  `id_usuario_comprador` o `id_usuario_vendedor`. El campo público `nombreCompleto` se obtiene
  únicamente de `jugadores.nombre_completo` para enriquecer el jugador identificado por
  `idJugador`; no aporta operaciones ni snapshots monetarios. La tabla `usuarios` puede consultarse
  únicamente para verificar la existencia del usuario autenticado y decidir si corresponde
  responder `404`; MUST NOT aportar operaciones ni datos del historial. MUST reutilizar las
  operaciones `COMPRA` y `VENTA` ya persistidas, sin crear tablas, migraciones, operaciones ni
  registros de lectura.
- **FR-004**: La respuesta MUST incluir el identificador del usuario y una colección `operaciones`.
  Cada elemento MUST incluir `idOperacion`, `tipo` (`COMPRA` o `VENTA`), `idJugador` como
  identificación del jugador, `nombreCompleto` del catálogo (o `null` si no está informado),
  `cantidadTokens`, `cotizacion` aplicada por token, `importe` total y `fechaHora` de realización.
- **FR-005**: `cantidadTokens` MUST ser un entero positivo; `cotizacion` e `importe` MUST
  conservar los valores monetarios del snapshot persistido con representación decimal canónica de
  dos posiciones, sin recalcularlos con la cotización actual ni usar punto flotante.
- **FR-006**: Las operaciones MUST ordenarse de forma determinista por `fechaHora` descendente
  (más reciente primero) y, ante igualdad, por `idOperacion` ascendente. El orden MUST ser igual
  para consultas repetidas con el mismo estado persistido.
- **FR-007**: La consulta MUST ser de solo lectura y MUST conservar la inmutabilidad append-only
  de `transacciones_mercado` y sus auditorías. No MUST modificar saldos, tokens, tenencias,
  cotizaciones, auditorías ni operaciones existentes.
- **FR-008**: La implementación MUST respetar la arquitectura `Controller -> Service -> Repository`:
  el Controller delega, el Service coordina autenticación/ownership y el Repository obtiene el
  read model; MUST reutilizar los mecanismos existentes de JWT, ownership y transacciones de
  Mercado.
- **FR-009**: El alcance MUST excluir portfolio, saldo actual, tenencias, cotizaciones vigentes o
  históricas del jugador, estrategia, nuevas operaciones y cualquier endpoint adicional de
  escritura.
- **FR-010**: La feature MUST incluir tests unitarios para ownership, mapeo del snapshot, tipos,
  orden estable, formato monetario y lista vacía; tests de integración contra PostgreSQL real
  para compras y ventas, aislamiento por usuario, orden, ausencia de escrituras e invariancia de
  la tabla; y tests HTTP con Supertest para `200`, `401`, `403`, `404`, `409` y `422`, sin modificar
  ni eliminar tests existentes.
- **FR-011**: Swagger/OpenAPI y la colección Postman del proyecto MUST documentar la ruta, Bearer,
  parámetro UUID, contrato de `200`, lista vacía y errores `401`, `403`, `404`, `409` y `422`.

### Contrato HTTP

**Request**:

```http
GET /users/{id}/transactions
Authorization: Bearer <JWT>
```

**Response `200`**:

```json
{
  "usuarioId": "<uuid>",
  "operaciones": [
    {
      "idOperacion": "<uuid>",
      "tipo": "COMPRA",
      "idJugador": "<uuid>",
      "nombreCompleto": "Lionel Andrés Messi",
      "cantidadTokens": 3,
      "cotizacion": "10.00",
      "importe": "30.00",
      "fechaHora": "2026-11-01T12:00:00.000Z"
    }
  ]
}
```

`importe` es el importe total de la operación. `idJugador` identifica al jugador y
`nombreCompleto` se lee del catálogo actual, sin alterar el snapshot de la operación. Una respuesta sin operaciones conserva la misma forma con
`"operaciones": []`.

**Errores**:

- `401`: Bearer ausente, inválido o vencido.
- `403`: el usuario autenticado no es propietario del historial solicitado.
- `404`: el UUID solicitado coincide con la identidad autenticada, pero el usuario no existe.
- `409`: datos persistidos incompatibles con las invariantes o con el contrato, sin respuesta
  parcial.
- `422`: `{id}` no es un UUID válido.

### Key Entities

- **Transacción de Mercado**: snapshot inmutable y común de una compra o venta, con tipo, jugador,
  cantidad, cotización aplicada, importe total, fecha y partes compradora/vendedora.
- **Historial de operaciones**: vista de solo lectura, no persistida, formada por las transacciones
  en las que participa el usuario autenticado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las consultas autorizadas devuelve exactamente todas y solo las
  operaciones del usuario, con los ocho campos del contrato y sin operaciones de otros usuarios.
- **SC-002**: El 100 % de las respuestas conserva la cotización e importe persistidos y el orden
  determinista definido, sin recalcular valores ni perder precisión decimal.
- **SC-003**: El 100 % de los casos de autenticación, ownership, usuario inexistente, UUID inválido
  y datos inconsistentes responde con el código documentado sin exponer un historial parcial.
- **SC-004**: El 100 % de las consultas repetidas deja sin cambios las operaciones, auditorías,
  saldos, tokens, tenencias y cotizaciones persistidas.
## Assumptions

- La primera versión no agrega filtros, paginación ni exportación; devuelve todo el historial
  propio en el orden definido.
- Se reutilizan el JWT, `OwnershipService`, la tabla `transacciones_mercado`, sus restricciones
  y las auditorías ya implementadas.
- `fechaHora` representa la fecha de realización de la operación y no se reemplaza por `creadoEn`.
- Las operaciones existentes de compra y venta ya contienen la cotización e importe que deben
  exponerse; la consulta no consulta `historial_cotizacion` ni `cotizacion_vigente`.
- El nombre completo se reutiliza desde `jugadores.nombre_completo`; si el catálogo no lo informa,
  se devuelve `null` sin alterar la operación persistida.
- Los tests nuevos se agregan en sus paquetes correspondientes y los tests existentes permanecen
  intactos, conforme a la Constitución.
