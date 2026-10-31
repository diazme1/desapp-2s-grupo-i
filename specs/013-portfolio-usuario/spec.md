# Feature Specification: Portfolio de usuario

**Feature Branch**: `013-portfolio-usuario`  
**Created**: 2026-10-31  
**Status**: Draft

**Input**: Especificar `GET /users/:id/portfolio` para Football Player Market como consulta
de solo lectura, reutilizando `tokens`, `tenencias_jugador`, `cotizacion_vigente` y
`transacciones_mercado`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el portfolio valorizado (Priority: P1)

Como usuario autenticado, quiero consultar mis posiciones con cantidad, cotización vigente,
precio promedio ponderado de compra, valor actual y ganancia o pérdida.

**Independent Test**: Preparar tenencias, tokens, compras y cotizaciones; invocar el endpoint y
comparar cada campo con el cálculo esperado.

**Acceptance Scenarios**:

1. **Given** dos tokens comprados a 10.00 y 12.00, y cotización vigente 15.00, **When** el
   usuario consulta, **Then** recibe `200`, promedio `11.00`, valor actual `30.00` y ganancia
   `8.00`.
2. **Given** una cotización histórica distinta de la vigente, **When** consulta, **Then** el
   valor actual usa únicamente la cotización vigente.
3. **Given** que no tiene tenencias positivas, **When** consulta, **Then** recibe `200` con
   `posiciones: []`.

### User Story 2 - Mantener privacidad y solo lectura (Priority: P1)

Como usuario, quiero que solo pueda consultar mi portfolio y que la consulta no modifique el
estado del mercado.

**Independent Test**: Probar autenticación y ownership, y comparar snapshots de las tablas antes
y después de la consulta.

**Acceptance Scenarios**:

1. **Given** un JWT ausente, inválido o vencido, **When** se invoca el endpoint, **Then** responde
   `401` sin efectos.
2. **Given** un usuario que solicita el portfolio de otro, **When** invoca el endpoint, **Then**
   responde `403`.
3. **Given** una tenencia inconsistente con sus tokens, **When** consulta, **Then** responde
   `409` sin devolver una valorización parcial ni modificar datos.
4. **Given** un JWT cuyo `sub` coincide con un UUID válido pero ese usuario no existe, **When**
   consulta su propio portfolio, **Then** responde `404`.

### Edge Cases

- UUID inválido: `422`. El ownership se valida antes de consultar el portfolio: si el `id`
  solicitado no coincide con el usuario autenticado, responde `403` incluso si ese UUID no existe;
  responde `404` únicamente si no existe el UUID propio del usuario autenticado.
- Tenencias con cantidad cero no generan posiciones.
- Si falta la cotización vigente de cualquier posición, responde `409`; no se usa historial,
  otra estrategia ni fallback.
- Las compras se ponderan por cantidad y cotización; las ventas no forman parte del promedio ni
  se exponen como historial.
- Sin compras registradas, `precioPromedioCompra` y `gananciaPerdida` son `null`.
- Las posiciones se ordenan por `idJugador` ascendente; la ganancia puede ser positiva, cero o
  negativa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Exponer únicamente `GET /users/:id/portfolio`, protegido por la autenticación y
  autorización existentes; el usuario solo puede consultar su propio `id`.
- **FR-002**: Validar `id` como UUID y validar el ownership antes de consultar el portfolio. Si
  `id` no coincide con el usuario autenticado, responder `403` aunque ese UUID no exista; responder
  `404` únicamente cuando no exista el UUID propio del usuario autenticado. JWT ausente o inválido
  responde `401` y UUID inválido responde `422`.
- **FR-003**: Incluir cada tenencia positiva de `tenencias_jugador` y verificarla contra el
  conteo de `tokens` del mismo usuario y jugador. Una diferencia responde `409`.
- **FR-004**: Resolver el precio actual exclusivamente desde `cotizacion_vigente` para la
  estrategia activa; nunca desde `historial_cotizacion` ni otra estrategia.
- **FR-005**: Calcular el promedio ponderado usando las transacciones `COMPRA` del usuario y
  jugador en `transacciones_mercado`. Las `VENTA` no se incluyen.
- **FR-006**: Calcular exactamente `costoDeAdquisicion = cantidadTenencia × precioPromedioCompra`,
  `valorActual = cantidadTenencia × cotizacionVigente` y
  `gananciaPerdida = valorActual − costoDeAdquisicion`. El promedio, el costo de adquisición y
  la ganancia se calculan sin redondear durante las operaciones; el redondeo half-up a dos
  posiciones ocurre únicamente al serializar la respuesta. Sin compras, promedio, costo de
  adquisición y ganancia son `null` en el cálculo de la posición.
- **FR-007**: Usar aritmética exacta, sin punto flotante, para todas las operaciones monetarias.
  Exponer los importes como strings decimales de dos posiciones.
- **FR-008**: No crear tablas ni migraciones, ni modificar saldos, tokens, tenencias,
  cotizaciones o transacciones.
- **FR-009**: Reutilizar los mecanismos existentes de autenticación, autorización, cotización,
  persistencia y aritmética exacta, creando componentes propios de lectura de portfolio cuando
  corresponda. El Controller delega al Service; los cálculos viven en el modelo o servicio de
  dominio.
- **FR-010**: Agregar tests nuevos unitarios, de integración PostgreSQL/Testcontainers y HTTP con
  Supertest, sin modificar ni eliminar tests existentes. Actualizar Swagger/OpenAPI y Postman.

### Contrato HTTP y Swagger

- **Request**: `GET /users/{id}/portfolio`, `Authorization: Bearer <JWT>`, `id` UUID.
- **Response `200`**:

  ```json
  {
    "usuarioId": "uuid",
    "posiciones": [
      {
        "idJugador": "uuid",
        "cantidadTokens": 2,
        "cotizacionVigente": "15.00",
        "precioPromedioCompra": "11.00",
        "valorActual": "30.00",
        "gananciaPerdida": "8.00"
      }
    ]
  }
  ```

- Portfolio vacío: `posiciones: []`. Una posición sin compras usa `null` en promedio y
  ganancia.
- El ownership se valida antes de consultar el portfolio: un `id` ajeno responde `403` aunque no
  exista; `404` se reserva para el UUID propio del usuario autenticado cuando no existe.
- Swagger debe documentar Bearer, parámetro, schemas y respuestas `401`, `403`, `404`, `409` y
  `422`. Postman debe incluir una consulta autenticada y verificar su respuesta.

### Verificaciones necesarias

- **Unitarias**: promedio ponderado, valor actual exacto, ganancias positiva/cero/negativa,
  ausencia de compras, portfolio vacío y detección de inconsistencias.
- **Integración PostgreSQL/Testcontainers**: lectura conjunta de las cuatro tablas, cotización
  vigente frente a histórica, estrategia activa, datos faltantes y snapshots sin escrituras.
- **HTTP con Supertest**: respuesta `200`, portfolio vacío, errores `401/403/404/409/422` y
  ausencia de efectos persistidos.
- **Documentación**: contrato Swagger/OpenAPI y request de Postman.

### Fuera de alcance

- Historial o detalle de transacciones, endpoints de escritura, cambios en compras o ventas y
  modificaciones del frontend.
- Tablas, migraciones, autenticación/autorización nuevas, cambios de saldos, tokens,
  tenencias, cotizaciones o transacciones.
- Cambios en estrategias de valuación, ranking o uso de cotizaciones históricas como precio
  actual.

### Key Entities

- **Portfolio**: vista calculada y no persistida de las posiciones positivas del usuario.
- **Tenencia y token de jugador**: cantidad agregada y unidades individuales que deben coincidir.
- **Cotización vigente**: precio actual de la estrategia activa.
- **Transacción de mercado**: compras usadas para calcular el promedio ponderado.

## Success Criteria *(mandatory)*

- **SC-001**: El 100 % de las consultas consistentes devuelve una posición por tenencia positiva
  con cálculos exactos.
- **SC-002**: El 100 % de las consultas repetidas deja sin cambios tokens, tenencias,
  cotizaciones y transacciones.
- **SC-003**: El 100 % de los casos de autenticación, ownership, UUID y usuario inexistente
  responde con el código documentado sin exponer datos.
- **SC-004**: El 100 % de las respuestas usa la cotización vigente y no inventa costo o ganancia
  cuando no hay compras.

## Assumptions

- La estrategia activa y sus cotizaciones se resuelven con los mecanismos existentes.
- `tenencias_jugador` define la cantidad actual y `tokens` se usa para validar consistencia.
- El promedio usa todas las compras registradas del usuario y jugador; las ventas no se muestran.
- Los importes se serializan con dos posiciones, conservando el cálculo exacto antes del redondeo.
- Una tenencia inicial sin compra registrada no tiene costo de adquisición calculable.
