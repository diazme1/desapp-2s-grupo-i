# Feature Specification: Usuarios y autenticación con JWT

**Feature Branch**: `feat/auth`

**Created**: 2026-09-09

**Status**: Draft

**Input**: Crear una funcionalidad para implementar autenticación de usuarios con JWT en
Football Player Market. El sistema debe permitir registrar usuarios e iniciar sesión
utilizando credenciales. Cuando sean válidas, debe emitir un JWT que identifique al usuario
en las solicitudes posteriores. La autenticación protegerá las operaciones que dependan de
la identidad. No se usarán API keys, OAuth, refresh tokens ni roles administrativos en esta
primera feature.

## Contexto de producto

Esta feature forma parte de Football Player Market. El contexto y las invariantes del
producto están definidos en [docs/product.md](../../docs/product.md) y en la constitución.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear una cuenta (Priority: P1)

Como una persona que quiere operar en el mercado, quiero crear una cuenta con mis
credenciales para poder autenticarme y usar funcionalidades protegidas.

**Why this priority**: Sin una cuenta no se puede identificar al usuario ni asociar sus
operaciones futuras.

**Independent Test**: Registrar una cuenta válida y verificar que se crea una identidad
usable para iniciar sesión, sin exponer la contraseña.

**Acceptance Scenarios**:

1. **Given** que no existe una cuenta con el correo informado, **When** se envían datos
   válidos de registro, **Then** se crea la cuenta y la respuesta no contiene la contraseña.
2. **Given** que ya existe una cuenta con el mismo correo normalizado, **When** se intenta
   registrarla nuevamente, **Then** la operación se rechaza con un conflicto sin duplicarla.
3. **Given** datos de registro incompletos o inválidos, **When** se envía la solicitud,
   **Then** se rechaza con un error de validación sin crear datos parciales.

---

### User Story 2 - Iniciar sesión y obtener acceso (Priority: P1)

Como usuario registrado, quiero iniciar sesión para obtener un token temporal y usar los
endpoints protegidos del sistema.

**Why this priority**: El token autoriza las operaciones sin enviar la contraseña en cada
solicitud.

**Independent Test**: Iniciar sesión con credenciales válidas y usar el token recibido en
una solicitud protegida.

**Acceptance Scenarios**:

1. **Given** una cuenta existente y credenciales correctas, **When** se inicia sesión,
   **Then** se devuelve un JWT firmado con la identidad y el vencimiento del usuario.
2. **Given** una cuenta existente y una contraseña incorrecta, **When** se inicia sesión,
   **Then** se rechaza con HTTP 401 y no se devuelve ningún token.
3. **Given** un correo no registrado, **When** se intenta iniciar sesión, **Then** se
   rechaza con HTTP 401 sin revelar si la cuenta existe.

---

### User Story 3 - Autorizar operaciones propias (Priority: P1)

Como usuario autenticado, quiero que el sistema use la identidad de mi JWT para permitir
solo operaciones sobre mis propios datos.

**Why this priority**: Evita que un usuario consulte o modifique información personal o
financiera perteneciente a otra persona.

**Independent Test**: Consultar un recurso propio con un JWT válido y repetir la operación
intentando indicar el identificador de otro usuario.

**Acceptance Scenarios**:

1. **Given** un JWT válido y vigente, **When** se consulta un recurso del usuario autenticado,
   **Then** la operación es autorizada usando la identidad contenida en el JWT.
2. **Given** un JWT válido del usuario A, **When** se solicita información del usuario B,
   **Then** la operación se rechaza con HTTP 403 y no entrega datos de B.
3. **Given** un JWT válido del usuario A, **When** se intenta modificar información del
   usuario B, **Then** la operación se rechaza con HTTP 403 y no modifica datos.
4. **Given** una solicitud sin token, con token alterado, malformado o vencido, **When** se
   consulta un endpoint protegido, **Then** responde HTTP 401 sin ejecutar la operación.
5. **Given** el endpoint público de salud, **When** se consulta sin autenticación, **Then**
   continúa respondiendo correctamente.

### Edge Cases

- El correo debe normalizarse de forma consistente para impedir duplicados por mayúsculas o
  espacios.
- La contraseña debe tener al menos 8 caracteres y nunca aparecer en respuestas, logs o
  mensajes de error.
- Un JWT con firma inválida, formato incorrecto, algoritmo no permitido o vencimiento
  superado debe rechazarse.
- La configuración ausente o insegura del secreto y vencimiento del JWT debe impedir un
  arranque inseguro y producir un error comprensible.
- El backend no debe confiar en un `userId` recibido del cliente cuando el JWT identifica
  al usuario autenticado.
- Las rutas públicas no deben quedar accidentalmente protegidas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir registrar un usuario con correo y contraseña válidos.
- **FR-002**: El sistema MUST normalizar el correo y rechazar duplicados sin crear datos
  parciales.
- **FR-003**: El sistema MUST almacenar las credenciales de forma que la contraseña original
  no pueda recuperarse.
- **FR-004**: El sistema MUST permitir iniciar sesión con credenciales válidas y devolver un
  JWT firmado con identidad y vencimiento.
- **FR-005**: El sistema MUST rechazar credenciales incorrectas con HTTP 401 sin revelar si
  el correo está registrado.
- **FR-006**: Los endpoints protegidos MUST exigir un JWT válido, vigente y emitido por el
  sistema.
- **FR-007**: El sistema MUST rechazar tokens ausentes, alterados, malformados, vencidos o
  emitidos con un algoritmo no permitido antes de ejecutar la operación.
- **FR-008**: El backend MUST obtener la identidad del usuario desde el JWT y MUST NOT
  confiar únicamente en un identificador enviado por el cliente.
- **FR-009**: Un usuario autenticado MUST NOT consultar ni modificar datos de otro usuario,
  salvo que una feature posterior defina explícitamente un rol con ese permiso.
- **FR-010**: El sistema MUST mantener público `GET /health` y declarar explícitamente las
  rutas que no requieren autenticación.
- **FR-011**: El secreto y la duración del JWT MUST configurarse fuera del código fuente y
  el sistema MUST rechazar una configuración insegura al arrancar.
- **FR-012**: El sistema MUST NOT usar API keys, OAuth, refresh tokens ni roles
  administrativos en esta feature.
- **FR-013**: El sistema MUST documentar registro, login, Bearer Token y respuestas de error
  en OpenAPI/Swagger.
- **FR-014**: La funcionalidad MUST incluir tests unitarios y de integración para casos
  felices y borde, sin modificar ni eliminar tests existentes.

### Key Entities

- **Usuario**: identidad que puede registrarse e iniciar sesión; tiene identificador,
  correo normalizado, credencial protegida y fecha de creación.
- **Token de acceso**: credencial temporal firmada que identifica al usuario, contiene su
  vencimiento y permite autorizar solicitudes protegidas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los registros válidos crea una cuenta y el 100 % de los registros
  duplicados o inválidos se rechaza sin duplicados ni datos parciales.
- **SC-002**: El 100 % de los logins válidos devuelve un JWT utilizable y el 100 % de los
  intentos inválidos devuelve HTTP 401 sin token.
- **SC-003**: El 100 % de las solicitudes protegidas sin token, con token inválido o vencido
  se rechaza antes de ejecutar la operación.
- **SC-004**: El 100 % de los intentos de acceder o modificar datos de otro usuario se
  rechaza sin exponer ni cambiar esos datos.
- **SC-005**: Ninguna respuesta, log ni mensaje de error expone contraseñas, secretos o
  tokens completos.
- **SC-006**: `GET /health` continúa disponible sin autenticación y las rutas protegidas
  documentan el esquema Bearer.
- **SC-007**: Los tests unitarios y de integración de la feature pasan con casos felices y
  borde, sin modificar los tests existentes de la app base.

## Assumptions

- La autenticación usa correo y contraseña; no se implementan API keys, OAuth, refresh
  tokens ni roles administrativos en esta feature.
- El JWT se envía en el encabezado `Authorization` con esquema Bearer.
- El registro y el login se exponen en `/auth/register` y `/auth/login`; `/auth/me` sirve
  como recurso protegido para demostrar la autorización.
- La contraseña tiene una longitud mínima de 8 caracteres.
- El vencimiento del JWT se configura por entorno con un valor seguro y documentado.
- No se implementan recuperación de contraseña ni login social en esta primera feature.
- Las reglas de autorización de esta feature se limitan a la propiedad del propio usuario;
  los roles se definirán en una feature posterior si fueran necesarios.
