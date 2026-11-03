# Especificación: Comprar tokens de jugador

**Rama**: `011-market-buy` · **Fecha**: 2026-10-27 · **Estado**: Draft

**Input**: User description: "Especificar la compra autenticada de tokens de un jugador al superusuario reutilizando usuarios, saldos, tokens, tenencias y cotizaciones vigentes, con operación atómica, consistente e idempotente."

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Comprar tokens al superusuario (Prioridad: P1)

Como usuario autenticado, quiero comprar una cantidad positiva de tokens de un jugador al
superusuario para incorporarlos a mi tenencia al precio vigente.

**Por qué esta prioridad**: Es la única operación de mercado incluida en la feature y habilita el
primer intercambio real de tokens sin introducir venta ni consultas de portfolio.

**Prueba independiente**: Con un jugador inicializado, una cotización vigente, tokens del
superadmin y saldo suficiente del comprador, ejecutar `POST /orders/buy` y verificar la
respuesta, los propietarios individuales, las tenencias, los dos saldos y el registro
inmutable de la operación.

**Escenarios de aceptación**:

1. **Given** un usuario autenticado distinto del superadmin, un jugador existente, una
   cotización de la estrategia activa, saldo suficiente y tokens disponibles del superadmin,
   **When** envía `POST /orders/buy` con una cantidad positiva y una clave de idempotencia
   nueva, **Then** recibe `201` con la operación registrada, la cotización y el importe exactos;
   los tokens se transfieren individualmente, aumenta su tenencia, disminuye la del
   superadmin, se debita su saldo y se acredita el mismo importe al superadmin.
2. **Given** una operación de compra confirmada, **When** se repite la misma petición con la
   misma clave de idempotencia y el mismo contenido, **Then** recibe el mismo resultado lógico y
   no se crean otra operación, otra auditoría ni un segundo movimiento de saldos o tokens.

### Historia de usuario 2 - Rechazar una compra inviable sin efectos parciales (Prioridad: P1)

Como usuario autenticado, necesito recibir un error claro cuando la compra no puede realizarse
para conservar intactos mi saldo, el inventario del superadmin, las tenencias y los registros.

**Por qué esta prioridad**: Una validación financiera o de disponibilidad que deje cambios parciales
rompería la conservación del suministro y la confianza en el mercado.

**Prueba independiente**: Repetir la petición con cada condición inválida o insuficiente y comparar
el estado completo antes y después, incluyendo registros de operación y auditoría.

**Escenarios de aceptación**:

1. **Given** un JWT ausente, inválido o vencido, **When** se invoca el endpoint, **Then** responde
   `401` y no modifica ninguna entidad del mercado.
2. **Given** un jugador inexistente, una cantidad no entera o no positiva, saldo insuficiente,
   cotización activa inexistente, o disponibilidad insuficiente del superadmin, **When** se
   invoca el endpoint, **Then** responde el error documentado, no registra la operación y deja
   sin cambios los saldos, tokens, tenencias y auditorías.
3. **Given** una clave de idempotencia ya asociada a otra petición o a otro comprador,
   **When** se reintenta con contenido diferente, **Then** responde conflicto y no ejecuta una
   segunda operación.

### Historia de usuario 3 - Mantener consistencia ante reintentos y concurrencia (Prioridad: P1)

Como operador del mercado, necesito que compras simultáneas o reintentadas produzcan un único
estado válido para no vender más tokens de los emitidos ni permitir saldos negativos.

**Por qué esta prioridad**: El inventario total es fijo y la compra modifica simultáneamente
propietarios, tenencias, saldos y registros financieros.

**Prueba independiente**: Ejecutar compras concurrentes sobre el mismo jugador y repetir peticiones
con la misma clave; al finalizar, comprobar que la suma de propietarios sigue siendo 100 y que
cada compra confirmada aparece una sola vez.

**Escenarios de aceptación**:

1. **Given** varias compras concurrentes que compiten por los mismos tokens, **When** finalizan,
   **Then** solo se confirman las que tienen disponibilidad y saldo en el orden serializado; no
   hay propietarios duplicados, tenencias divergentes ni saldo negativo.
2. **Given** una falla durante cualquier validación o persistencia, **When** termina la petición,
   **Then** no queda ningún cambio parcial y una nueva petición válida puede reintentarse.
3. **Given** una compra y un recálculo concurrentes sobre el mismo jugador, iniciados con una
   barrera controlada, **When** ambas operaciones finalizan, **Then** una espera el lock de la otra
   y la operación confirmada conserva un snapshot completo y coherente de estrategia, versión,
   `idRecalculo`, cotización e importe; la operación y la cotización activa final quedan
   persistidas consistentemente, sin doble transferencia, saldos negativos ni tenencias
   inconsistentes.

### Casos borde

- La cantidad igual a cero, negativa, fraccionaria, ausente o fuera del rango disponible se
  rechaza antes de transferir tokens.
- `Idempotency-Key` ausente, vacío, con espacios laterales o internos, de más de 128 caracteres,
  con caracteres de control o fuera de `[A-Za-z0-9._~-]` se rechaza con `422` antes de modificar
  el mercado; los espacios laterales se recortan antes de validar y persistir.
- Si el jugador existe pero no tiene una cotización en la estrategia activa, la compra se
  rechaza; no se consulta una fila histórica ni la cotización de otra estrategia.
- Si el comprador es el superadmin vendedor, la operación se rechaza porque no existe una
  transferencia válida entre partes distintas.
- Si el superadmin no tiene saldo persistido, se lo trata como saldo cero antes de una compra
  exitosa; no se le otorga saldo inicial artificial. La primera venta confirmada puede crear o
  actualizar su saldo por el importe acreditado.
- Una compra total deja la tenencia del superadmin en cero y conserva exactamente la suma de
  100 tokens; una compra parcial conserva el remanente.
- Una falla de auditoría, operación, saldo, tenencia o token revierte todos los cambios de la
  compra.
- Un reintento con la misma clave y payload devuelve el resultado confirmado; la misma clave
  con distinto comprador o payload no puede reutilizarse.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema MUST exponer únicamente `POST /orders/buy` para esta feature y exigir
  autenticación JWT; el comprador MUST ser un usuario autenticado distinto del superadmin que
  actúa como vendedor.
- **FR-002**: El request MUST recibir un `idJugador` existente y una `cantidadTokens` entera
  estrictamente positiva. La clave `Idempotency-Key` MUST ser un header obligatorio, no formar
  parte del body y normalizarse recortando espacios laterales. Luego del recorte MUST tener entre
  1 y 128 caracteres ASCII y solo contener `[A-Za-z0-9._~-]`; espacios internos, controles,
  caracteres inválidos y valores vacíos MUST responder `422`. El valor normalizado MUST permanecer
  estable durante los reintentos de una misma intención y ser el usado para persistencia y
  comparación idempotente.
- **FR-003**: El caso de uso MUST obtener la estrategia activa y usar exclusivamente la fila de
  cotización vigente del jugador para esa estrategia. MUST conservar la estrategia, versión,
  cotización y fecha utilizadas; MUST NOT calcular una cotización ni leer directamente el
  historial como fuente del precio.
- **FR-004**: El importe MUST ser exactamente `cantidadTokens × cotización vigente`, usando la
  representación exacta de créditos y cotizaciones existente. La respuesta y los registros
  MUST conservar `cotizacion` e `importe` como valores decimales canónicos con dos posiciones.
- **FR-005**: El sistema MUST validar que el comprador tenga saldo suficiente y que el
  superadmin posea al menos la cantidad solicitada de tokens del jugador. La disponibilidad se
  MUST determinar sobre tokens individuales, no solo sobre la tenencia agregada.
- **FR-006**: Una compra exitosa MUST transferir del superadmin al comprador exactamente la
  cantidad solicitada de tokens individuales, actualizar ambas tenencias agregadas y conservar
  la suma total de 100 tokens por jugador.
- **FR-007**: Una compra exitosa MUST debitar al comprador el importe exacto y acreditarlo al
  superadmin. El superadmin MUST comenzar con saldo cero o sin saldo asignado y MUST NOT recibir
  una carga inicial especial por esta feature.
- **FR-008**: El sistema MUST registrar una operación de compra y una auditoría append-only e
  inmutable. Ambas deben identificar comprador, superadmin vendedor, jugador, cantidad,
  estrategia y versión activa, cotización, importe, fecha y clave de idempotencia; la operación
  confirmada no puede editarse ni eliminarse.
- **FR-009**: La operación, auditoría, transferencia de tokens, tenencias y saldos MUST
  confirmarse como una unidad atómica. Si falla una validación o una escritura, MUST revertirse
  todo el estado de la compra y no debe quedar registro parcial.
- **FR-010**: El sistema MUST serializar las compras que compiten por el mismo jugador o por los
  mismos saldos y MUST coordinarse con el cambio de cotización activa, incluso durante un recálculo
  concurrente sobre el mismo jugador, para que cada operación use un estado coherente. Nunca debe
  vender más de 100 tokens, duplicar la propiedad de un token ni dejar saldos negativos.
- **FR-011**: La idempotencia MUST asociar la clave al comprador y al contenido de la operación.
  Repetir una compra confirmada con la misma clave y payload MUST devolver el resultado existente
  sin nuevos efectos; reutilizarla con otro comprador o payload MUST rechazarse sin efectos.
  Las peticiones que no llegan a confirmarse no deben producir una operación exitosa parcial.
- **FR-012**: El contrato HTTP MUST documentar request, `Authorization: Bearer`,
  `Idempotency-Key`, respuesta exitosa y errores `401`, `403`, `404`, `409` y `422` en Swagger;
  la colección de Postman MUST incluir una ejecución autenticada y verificaciones del resultado.
- **FR-013**: La feature MUST incluir tests unitarios del dominio y del caso de uso, tests de
  integración contra PostgreSQL/Testcontainers, tests HTTP con Supertest y verificaciones de
  Swagger y Postman. No se deben modificar tests existentes sin autorización explícita.

### Contrato HTTP

- **Request**: `POST /orders/buy`, JWT Bearer y header `Idempotency-Key` normalizado; el header no
  forma parte del body. El body es
  `{ "idJugador": "<uuid>", "cantidadTokens": <entero positivo> }`.
- **Response `201`**: `{ idOperacion, idJugador, idComprador, idVendedor, cantidadTokens,
  cotizacion: "0.00", importe: "0.00", estrategia, idVersionEstrategia, fechaHora,
  idempotencyKey }`. Un reintento idempotente devuelve la misma operación confirmada.
- **Errores**: `401` para autenticación ausente o inválida; `403` para el superadmin como
  comprador; `404` para jugador inexistente; `409` para saldo, disponibilidad, cotización o
  clave idempotente en conflicto; `422` para body, UUID, cantidad o `Idempotency-Key` inválidos
  según las reglas de normalización.

### Reglas de `Idempotency-Key`

- Se recortan espacios laterales antes de validar.
- El valor normalizado debe tener entre 1 y 128 caracteres ASCII de `[A-Za-z0-9._~-]`.
- Se rechazan espacios internos, controles, caracteres fuera del conjunto y valores vacíos con
  `422`, sin efectos en tokens, tenencias, saldos, órdenes ni auditorías.
- La base persiste y compara el valor normalizado con la restricción `UNIQUE`; el replay conserva
  el comportamiento idempotente existente.

### Verificaciones necesarias

- Unitarias: importe exacto, operaciones de saldo, transferencia de tokens, actualización de
  tenencias, validación de cantidad, comportamiento de idempotencia y normalización de
  `Idempotency-Key` (ausente, vacío, espacios laterales/internos, longitud, caracteres inválidos
  y valor válido).
- Integración PostgreSQL/Testcontainers: compra parcial y total, cotización activa frente a
  historial, saldo cero del superadmin antes de vender, rollback ante fallas, claves repetidas,
  concurrencia de compras y carrera controlada entre compra y recálculo sobre el mismo jugador,
  verificando snapshot completo, operación final, cotización activa, saldos y tenencias.
- HTTP con Supertest: autenticación, códigos de error, body de respuesta y ausencia de efectos
  ante requests rechazadas, incluyendo todos los casos inválidos de `Idempotency-Key`.
- Documentación: ruta, seguridad, schemas y errores en Swagger/OpenAPI; request autenticada,
  reintento idempotente y aserciones de saldo/tenencias en Postman.

### Fuera de alcance

- Venta de tokens, portfolio, ranking, consulta del historial de operaciones y cambios en el
  frontend.
- Compra a una contraparte distinta del superadmin o mecanismos paralelos de autenticación,
  saldo, tokens, tenencias o cotizaciones.

### Entidades clave *(incluidas porque la feature involucra datos)*

- **Orden de compra**: registro inmutable de una compra confirmada, su clave de idempotencia,
  partes, jugador, cantidad, cotización, estrategia, importe y fecha.
- **Auditoría de compra**: registro append-only que deja evidencia de la misma operación y sus
  valores financieros, sin permitir edición ni eliminación.
- **Token de jugador**: unidad individual cuyo propietario actual cambia del superadmin al
  comprador.
- **Tenencia de jugador**: cantidad agregada por usuario y jugador, consistente con el conteo de
  tokens individuales.
- **Saldo de usuario**: créditos disponibles del comprador y del superadmin, representados con
  la precisión exacta existente.
- **Cotización vigente y estrategia activa**: fuente del precio aplicado; el historial solo
  conserva trazabilidad y no determina el importe de la compra.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El 100 % de las compras válidas verificadas responde con una operación completa y
  los saldos, tenencias y tokens reflejan exactamente la cantidad y el importe confirmados.
- **SC-002**: El 100 % de las validaciones inválidas, fallas de persistencia y conflictos de
  disponibilidad verificados deja sin cambios los saldos, tokens, tenencias, operación y
  auditoría.
- **SC-003**: En todas las pruebas concurrentes, la suma de tokens por jugador permanece en 100,
  cada token tiene un único propietario y ningún saldo queda negativo.
- **SC-004**: El 100 % de los reintentos con la misma clave y payload devuelve la operación
  confirmada sin duplicar registros ni movimientos financieros; una clave con contenido distinto
  nunca produce una segunda compra.
- **SC-005**: El 100 % de las operaciones confirmadas registra la cotización de la estrategia
  activa vigente al momento de la compra, incluso en una carrera controlada con recálculo
  concurrente, con estrategia, versión, `idRecalculo`, importe reproducible y representación
  exacta a dos decimales, sin usar una cotización histórica como precio.
- **SC-006**: Un usuario autenticado puede completar una compra válida en una única petición y
  puede verificar en la respuesta quién compró, qué jugador recibió, cuántos tokens recibió, qué
  cotización se aplicó, cuánto pagó y cuándo ocurrió.
- **SC-007**: Los tests nuevos, la documentación Swagger/OpenAPI y la colección Postman cubren el
  contrato completo sin modificar tests existentes.

## Supuestos

- El registro público mantiene el saldo inicial existente para usuarios comunes; el superadmin
  compartido continúa creándose mediante el bootstrap actual sin solicitar `saldoInicial`.
- La clave de idempotencia se transporta únicamente en el header `Idempotency-Key`; se recortan
  sus espacios laterales y el valor normalizado debe cumplir longitud 1–128 y caracteres
  `[A-Za-z0-9._~-]`. Su valor normalizado no forma parte del body de negocio.
- `cantidadTokens` es un entero JSON positivo y los valores monetarios de este endpoint se
  exponen como strings decimales con dos posiciones para no perder exactitud.
- La cotización vigente puede ser cero si la estrategia activa la produjo; en ese caso el importe
  exacto es cero y las restantes reglas de disponibilidad, idempotencia y auditoría siguen
  aplicando.
- El jugador debe estar inicializado con sus 100 tokens y el superadmin es la única contraparte
  vendedora de esta primera operación.
- El cambio de estrategia o de cotización concurrente se ordena respecto de la compra; la
  operación confirmada conserva el snapshot de cotización que efectivamente aplicó.
- Esta especificación agrega solo la compra; no crea endpoints de lectura de operaciones ni
  modifica el frontend.
