# Especificación: Vender tokens de jugador

**Rama**: `012-market-sell` · **Fecha**: 2026-10-29 · **Estado**: Draft

**Input**: User description: "Especificar la venta autenticada de tokens de jugadores para
Football Player Market reutilizando la arquitectura, entidades, cotización vigente,
autenticación e idempotencia de market-foundation y market-buy, con una transacción común
para compras y ventas."

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Vender tokens al superadmin (Prioridad: P1)

Como usuario común autenticado, quiero vender una cantidad positiva de tokens que poseo al
superadmin para recibir el importe exacto calculado con la cotización vigente.

**Por qué esta prioridad**: Es el flujo principal de la feature y completa el intercambio de
tokens iniciado por la compra sin introducir otra contraparte ni otro mecanismo de autenticación.

**Prueba independiente**: Con un jugador inicializado, una cotización vigente, una tenencia del
usuario y una clave de idempotencia nueva, ejecutar `POST /orders/sell` y verificar la respuesta,
los propietarios individuales, las tenencias, los dos saldos y el registro común de la operación.

**Escenarios de aceptación**:

1. **Given** un usuario común autenticado distinto del superadmin, un jugador existente, una
   cotización de la estrategia activa, una tenencia suficiente y una clave de idempotencia válida,
   **When** envía `POST /orders/sell` con una cantidad positiva, **Then** recibe `201` con la
   operación registrada, la cotización y el importe exactos; los tokens se transfieren
   individualmente al superadmin, disminuye la tenencia del usuario, aumenta la del superadmin,
   se acredita el importe exacto al usuario y se debita el mismo importe al superadmin.
2. **Given** que el superadmin no tiene saldo suficiente o no tiene una fila de saldo persistida,
   **When** se procesa una venta válida, **Then** la venta no se rechaza por esa condición; su
   saldo se actualiza como corresponda, incluso si queda negativo, y el usuario recibe el importe
   completo.
3. **Given** una venta confirmada, **When** se repite la misma petición con la misma clave
   normalizada y el mismo contenido, **Then** recibe el mismo resultado lógico sin crear otra
   operación, auditoría, transferencia ni movimiento de saldos.

### Historia de usuario 2 - Rechazar una venta inviable sin efectos parciales (Prioridad: P1)

Como usuario autenticado, necesito recibir un error claro cuando no puedo vender para conservar
intactos mis tokens, las tenencias, los saldos y los registros del mercado.

**Por qué esta prioridad**: Una validación de identidad, tenencia o cotización que deje cambios
parciales rompería la conservación del suministro y la confianza en el mercado.

**Prueba independiente**: Repetir la petición con cada condición inválida o insuficiente y
comparar el estado completo antes y después, incluyendo tokens individuales, tenencias, saldos,
operación y auditoría.

**Escenarios de aceptación**:

1. **Given** un JWT ausente, inválido o vencido, **When** se invoca el endpoint, **Then** responde
   `401` y no modifica ninguna entidad del mercado.
2. **Given** que el comprador implícito es el superadmin, **When** el superadmin intenta vender,
   **Then** responde `403` y no se realiza ninguna transferencia.
3. **Given** un jugador inexistente, una cantidad no entera o no positiva, o un
   `Idempotency-Key` inválido, **When** se invoca el endpoint, **Then** responde el error
   documentado sin modificar tokens, tenencias, saldos, operaciones ni auditorías.
4. **Given** que el usuario no posee la cantidad solicitada, no existe cotización vigente de la
   estrategia activa, o la clave ya identifica otro contenido, **When** se invoca el endpoint,
   **Then** responde `409` sin efectos parciales y no consulta una cotización histórica ni aplica
   un fallback.

### Historia de usuario 3 - Mantener consistencia ante concurrencia y fallas (Prioridad: P1)

Como operador del mercado, necesito que ventas simultáneas, compras concurrentes y reintentos
produzcan un único estado válido y auditable.

**Por qué esta prioridad**: La venta modifica simultáneamente propietarios individuales,
tenencias, saldos, cotización aplicada y registros append-only; cualquier intercalado incorrecto
puede duplicar tokens o dinero.

**Prueba independiente**: Ejecutar ventas concurrentes sobre el mismo jugador, combinar ventas y
compras que compitan por los mismos tokens y provocar fallas controladas de persistencia; al
finalizar, comprobar que solo se confirman operaciones viables, que cada operación aparece una
sola vez y que el estado puede reintentarse sin residuos.

**Escenarios de aceptación**:

1. **Given** varias ventas concurrentes que compiten por tokens del mismo usuario, **When**
   finalizan, **Then** solo se confirman las que tenían disponibilidad al serializarse, no se
   transfieren tokens inexistentes y la suma de tokens del jugador sigue siendo exactamente 100.
2. **Given** una venta y una compra concurrentes sobre el mismo jugador, **When** finalizan,
   **Then** ambas respetan el orden serializado, ningún token tiene dos propietarios, las
   tenencias agregadas coinciden con los tokens individuales y no se viola ninguna regla de
   saldo de los usuarios comunes.
3. **Given** una venta concurrente con un recálculo o cambio de cotización, **When** ambas
   operaciones finalizan, **Then** la venta conserva un snapshot completo y coherente de la
   estrategia, versión, `idRecalculo`, cotización e importe que efectivamente utilizó, sin leer
   una fila histórica como fallback.
4. **Given** una falla durante una validación o escritura, **When** termina la petición, **Then**
   se revierten tokens, tenencias, saldos, operación y auditoría como una unidad, y una nueva
   petición válida puede ejecutarse sin residuos parciales.

### Casos borde

- La cantidad igual a cero, negativa, fraccionaria, ausente o mayor que la tenencia del usuario
  se rechaza antes de transferir tokens.
- `Idempotency-Key` ausente, vacío, con espacios laterales o internos, de más de 128 caracteres,
  con caracteres de control o fuera de `[A-Za-z0-9._~-]` se rechaza con `422`; los espacios
  laterales se recortan antes de validar y persistir.
- Si el jugador existe pero no tiene una cotización en la estrategia activa, la venta se rechaza;
  no se consulta una cotización histórica, una estrategia inactiva ni otro precio de respaldo.
- Si el usuario autenticado es el superadmin, la venta se rechaza porque el superadmin solo es el
  comprador de esta operación.
- Si el saldo del superadmin no existe, se lo trata como saldo cero; una venta válida crea o
  actualiza ese saldo y puede dejarlo negativo. La falta de créditos del superadmin nunca rechaza
  una venta.
- Si la cotización vigente es cero, el importe exacto es cero y la venta conserva sus reglas de
  tenencia, idempotencia, auditoría y conservación de tokens.
- Una venta total deja la tenencia del usuario en cero, aumenta la del superadmin y conserva
  exactamente la suma de 100 tokens; una venta parcial conserva el remanente.
- Una falla de auditoría, operación, saldo, tenencia o token revierte todos los cambios de la
  venta.
- Un reintento con la misma clave y payload devuelve la operación confirmada; la misma clave con
  distinto usuario, payload o tipo de operación no puede reutilizarse.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema MUST exponer únicamente `POST /orders/sell` para esta feature y exigir
  autenticación JWT Bearer. Solo un usuario común autenticado puede vender; el superadmin MUST
  ser siempre el comprador implícito de los tokens.
- **FR-002**: El request MUST recibir un `idJugador` existente y una `cantidadTokens` entera
  estrictamente positiva. La clave `Idempotency-Key` MUST ser un header obligatorio, no formar
  parte del body y normalizarse recortando espacios laterales. Luego del recorte MUST tener entre
  1 y 128 caracteres ASCII y solo contener `[A-Za-z0-9._~-]`; espacios internos, controles,
  caracteres inválidos y valores vacíos MUST responder `422`. El valor normalizado MUST ser el
  usado para persistencia y comparación idempotente.
- **FR-003**: El caso de uso MUST obtener la estrategia activa y usar exclusivamente la fila de
  cotización vigente del jugador para esa estrategia. MUST conservar la estrategia, versión,
  `idRecalculo`, cotización y fecha utilizadas; MUST NOT consultar cotizaciones históricas ni
  calcular o sustituir el precio con un fallback.
- **FR-004**: El importe MUST ser exactamente `cantidadTokens × cotización vigente`, usando la
  representación exacta de créditos y cotizaciones existente. La respuesta, la transacción y la
  auditoría MUST conservar `cotizacion` e `importe` como valores decimales canónicos con dos
  posiciones.
- **FR-005**: El sistema MUST validar que el vendedor tenga individualmente la cantidad solicitada
  de tokens del jugador. La disponibilidad MUST determinarse sobre tokens individuales y no solo
  sobre una tenencia agregada.
- **FR-006**: Una venta exitosa MUST transferir del usuario al superadmin exactamente la cantidad
  solicitada de tokens individuales, actualizar ambas tenencias agregadas y conservar la suma
  total de 100 tokens por jugador.
- **FR-007**: Una venta exitosa MUST acreditar al usuario el importe exacto y debitar al
  superadmin el mismo importe. La venta MUST ejecutarse aunque el saldo del superadmin sea cero,
  no exista o quede negativo. El saldo del superadmin MUST estar exento de la validación de
  créditos insuficientes. La venta MUST rechazarse únicamente si el saldo del usuario común
  vendedor es insuficiente; los saldos de los usuarios comunes MUST conservar sus reglas actuales.
- **FR-008**: Compras y ventas MUST registrarse en una única tabla común
  `transacciones_mercado`, con un campo `tipo` que solo admita `COMPRA` o `VENTA` y los datos
  compartidos de ambas operaciones. Para una venta, `idVendedor` MUST ser el usuario común y
  `idComprador` MUST ser el superadmin. No se deben crear tablas separadas para compras y ventas,
  y la adaptación MUST conservar la información de compras existentes.
- **FR-009**: La operación confirmada MUST tener un registro de auditoría append-only e inmutable
  que reutilice o adapte la auditoría existente de compras para cubrir ambos tipos sin duplicar
  responsabilidades. La transacción común y la auditoría MUST identificar tipo, comprador,
  vendedor, jugador, cantidad, estrategia y versión activa, `idRecalculo`, cotización, importe,
  fecha y clave de idempotencia.
- **FR-010**: La transacción común, auditoría, transferencia de tokens, tenencias y saldos MUST
  confirmarse como una unidad atómica. Si falla una validación o una escritura, MUST revertirse
  todo el estado de la venta y no debe quedar registro parcial.
- **FR-011**: El sistema MUST serializar ventas que compiten por el mismo jugador, tokens,
  tenencias o saldos, y MUST coordinarse con compras y cambios de cotización concurrentes para que
  cada operación use un estado coherente. Nunca debe duplicar la propiedad de un token, superar
  el suministro de 100 ni dejar un saldo común por debajo de las reglas vigentes.
- **FR-012**: La idempotencia MUST asociar la clave normalizada al usuario vendedor, al tipo de
  operación y al contenido canónico. Repetir una venta confirmada con la misma clave y payload
  MUST devolver la operación existente sin nuevos efectos; reutilizarla con otro usuario, payload
  o tipo MUST rechazarse con `409` sin efectos.
- **FR-013**: El contrato HTTP MUST documentar request, `Authorization: Bearer`,
  `Idempotency-Key`, respuesta exitosa y errores `401`, `403`, `404`, `409` y `422` en Swagger.
  La colección de Postman MUST incluir una venta autenticada, un reintento idempotente y
  verificaciones del resultado.
- **FR-014**: La feature MUST incluir tests unitarios del dominio y del caso de uso, tests de
  integración contra PostgreSQL/Testcontainers, tests HTTP con Supertest y verificaciones de
  Swagger y Postman. Los tests nuevos MUST cubrir casos felices, errores, concurrencia, rollback,
  cotización activa e idempotencia. Los tests existentes de `market-buy` que consulten las tablas
  específicas anteriores MUST adaptarse a `transacciones_mercado` y conservar su cobertura;
  no se deben borrar tests ni modificar tests ajenos a Mercado.

### Reglas de arquitectura y continuidad

- El Controller MUST recibir el request y delegar únicamente en el Service; no debe contener
  reglas de negocio ni acceder directamente a repositories.
- El DTO o pipe MUST validar tipos, forma, UUID, cantidad y normalización de `Idempotency-Key`.
  El Service MUST comprobar la existencia del jugador, resolver la estrategia y cotización activa
  y orquestar el caso de uso y su persistencia atómica.
- El modelo de dominio MUST resolver las reglas de venta, transferencia individual, tenencias,
  saldos, idempotencia y sus invariantes. No debe conocer NestJS, HTTP, PostgreSQL ni repositories.
  Los repositories MUST abstraer la persistencia y no implementar reglas de negocio.
- La solución MUST reutilizar la autenticación, entidades, cotización vigente, idempotencia,
  auditoría y reglas de capas existentes en `market-foundation` y `market-buy`, manteniendo el
  contrato vigente de `POST /orders/buy`.

### Contrato HTTP

- **Request**: `POST /orders/sell`, JWT Bearer y header `Idempotency-Key` normalizado; el header
  no forma parte del body. El body es
  `{ "idJugador": "<uuid>", "cantidadTokens": <entero positivo> }`.
- **Response `201`**: `{ idOperacion, idJugador, idComprador, idVendedor, cantidadTokens,
  cotizacion: "0.00", importe: "0.00", estrategia, idVersionEstrategia, fechaHora,
  idempotencyKey }`. En una venta, `idComprador` es el superadmin y `idVendedor` es el usuario
  autenticado. `idRecalculo` se conserva en el snapshot de la operación y la auditoría, pero no
  agrega un campo al contrato público existente. Un reintento idempotente devuelve la misma
  operación confirmada.
- **Errores**: `401` para autenticación ausente o inválida; `403` para una identidad inexistente
  o no autorizada, incluido el superadmin como vendedor; `404` para jugador inexistente; `409` para
  tenencia insuficiente, cotización activa inexistente, conflicto de concurrencia o clave
  idempotente incompatible; `422` para body, UUID, cantidad o `Idempotency-Key` inválidos según
  las reglas de normalización. La falta de créditos del superadmin MUST NOT producir `409`.

### Reglas de `Idempotency-Key`

- Se recortan espacios laterales antes de validar.
- El valor normalizado debe tener entre 1 y 128 caracteres ASCII de `[A-Za-z0-9._~-]`.
- Se rechazan espacios internos, controles, caracteres fuera del conjunto y valores vacíos con
  `422`, sin efectos en tokens, tenencias, saldos, transacciones ni auditorías.
- La base persiste y compara el valor normalizado con la restricción única y el payload canónico;
  el replay conserva el comportamiento idempotente existente y una clave usada por una compra no
  puede producir una venta distinta.

### Verificaciones necesarias

- **Unitarias**: importe exacto; acreditación al usuario; débito sin límite inferior del
  superadmin; reglas vigentes para saldos comunes; transferencia individual; actualización de
  tenencias; validación de cantidad; tipo `VENTA`; comportamiento de idempotencia y normalización
  de `Idempotency-Key` (ausente, vacío, espacios laterales/internos, longitud, caracteres
  inválidos y valor válido).
- **Integración PostgreSQL/Testcontainers**: venta parcial y total; cotización activa frente a
  historial; saldo cero, ausente y negativo del superadmin; rollback ante fallas; claves repetidas
  y payload incompatible; transacciones comunes con `COMPRA` y `VENTA`; auditoría append-only;
  concurrencia de ventas y compras; y carrera controlada entre venta y recálculo sobre el mismo
  jugador, verificando snapshot completo, operación final, cotización activa, saldos y tenencias.
- **HTTP con Supertest**: autenticación, permisos, códigos de error, body de respuesta y ausencia
  de efectos ante requests rechazadas, incluyendo todos los casos inválidos de
  `Idempotency-Key`.
- **Documentación**: ruta, seguridad, schemas y errores en Swagger/OpenAPI; request autenticada,
  reintento idempotente y aserciones de saldo, tenencias y operación común en Postman.

### Fuera de alcance

- Portfolio, historial o consulta de transacciones y nuevos endpoints de lectura.
- Frontend, ranking, mecanismos nuevos o paralelos de autenticación, saldos, tokens, tenencias o
  cotizaciones.
- Venta a una contraparte distinta del superadmin, compra desde una contraparte distinta del
  superadmin o endpoints adicionales de venta.
- Consulta de cotizaciones históricas como fuente de precio, fallbacks de cotización y cambios en
  la lógica de recálculo que no sean necesarios para coordinar la concurrencia.
- Eliminación de tests. Los tests existentes de `market-buy` se adaptan únicamente para reflejar
  la migración a `transacciones_mercado`.

### Entidades clave *(incluidas porque la feature involucra datos)*

- **Transacción de mercado**: registro inmutable y común de una compra o venta, identificado por
  `tipo` (`COMPRA` o `VENTA`), clave idempotente, partes, jugador, cantidad, cotización,
  estrategia, versión, `idRecalculo`, importe y fecha.
- **Auditoría de mercado**: registro append-only e inmutable que deja evidencia de cada operación
  confirmada, reutilizando la responsabilidad de auditoría existente sin duplicar un registro por
  tipo de operación.
- **Token de jugador**: unidad individual cuyo propietario actual cambia del usuario común al
  superadmin en una venta.
- **Tenencia de jugador**: cantidad agregada por usuario y jugador, consistente con el conteo de
  tokens individuales.
- **Saldo de usuario**: créditos del vendedor y del superadmin, representados con la precisión
  exacta existente; el saldo del superadmin puede quedar negativo por una venta válida.
- **Cotización vigente y estrategia activa**: única fuente del precio aplicado; el historial solo
  conserva trazabilidad y no determina el importe de la venta.
- **Clave de idempotencia**: valor normalizado que vincula un intento con su actor, tipo y payload
  canónico para impedir efectos duplicados.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El 100 % de las ventas válidas verificadas responde con una operación completa y
  los saldos, tenencias y tokens reflejan exactamente la cantidad y el importe confirmados.
- **SC-002**: El 100 % de las validaciones inválidas, fallas de persistencia y conflictos de
  tenencia verificados deja sin cambios los saldos, tokens, tenencias, transacción y auditoría.
- **SC-003**: En todas las pruebas concurrentes, la suma de tokens por jugador permanece en 100,
  cada token tiene un único propietario, ninguna tenencia común es negativa y no se rechaza una
  venta válida por el saldo del superadmin.
- **SC-004**: El 100 % de los reintentos con la misma clave y payload devuelve la operación
  confirmada sin duplicar registros ni movimientos financieros; una clave con contenido o tipo
  distinto nunca produce una segunda venta.
- **SC-005**: El 100 % de las operaciones confirmadas registra la cotización de la estrategia
  activa vigente al momento de la venta, incluso en una carrera controlada con recálculo
  concurrente, con estrategia, versión, `idRecalculo`, importe reproducible y representación
  exacta a dos decimales.
- **SC-006**: Un usuario común autenticado puede completar una venta válida en una única petición
  y puede verificar en la respuesta quién compró, quién vendió, qué jugador recibió los tokens,
  cuántos se transfirieron, qué cotización se aplicó, cuánto se acreditó y cuándo ocurrió.
- **SC-007**: Cada operación confirmada aparece una sola vez en `transacciones_mercado`, con
  `tipo` correcto y una auditoría append-only correspondiente; la adaptación no crea registros
  paralelos de compra y venta.
- **SC-008**: El 100 % de los tests nuevos y adaptados, la documentación Swagger/OpenAPI y la
  colección Postman cubren el contrato completo; ningún test existente se elimina y los tests
  ajenos a Mercado permanecen sin cambios.

## Supuestos

- Existe un único superadmin compartido, identificado por el mecanismo ya utilizado por
  `market-foundation` y `market-buy`; no se crea otro superadmin para vender.
- El jugador está inicializado con sus 100 tokens y el usuario común solo puede vender tokens cuyo
  propietario individual es él.
- La cotización vigente puede ser cero si la estrategia activa la produjo; en ese caso el importe
  es cero y la operación sigue siendo auditable e idempotente.
- Los importes y cotizaciones se exponen como strings decimales con dos posiciones, y el cálculo
  reutiliza la representación exacta existente sin conversiones de punto flotante.
- El registro de compras existente se adapta al modelo común conservando los datos necesarios;
  los consumidores del contrato vigente de `POST /orders/buy` no deben recibir una segunda forma
  de persistencia. Se autoriza adaptar los tests existentes de `market-buy` que consultan las
  tablas antiguas para que verifiquen la tabla común.
- La clave de idempotencia se transporta únicamente en el header y sus reglas de normalización
  son las ya implementadas para la compra.
- La auditoría interna es obligatoria para la operación, pero no se agrega un endpoint público
  para consultar el historial.
- La respuesta de replay conserva el código y el contenido lógico de la operación confirmada;
  una petición que no llega a confirmarse no se convierte en una venta exitosa parcial.
