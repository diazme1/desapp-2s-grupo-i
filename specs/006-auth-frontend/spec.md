# Feature Specification: Autenticación del frontend

**Feature Branch**: `006-auth-frontend`

**Created**: 2026-09-20

**Status**: Draft

**Input**: Diseñar la interfaz web de login y registro para Football Player Market,
reutilizando la autenticación JWT ya implementada en el backend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear una cuenta desde el frontend (Priority: P1)

Como una persona que quiere operar en el mercado, quiero registrarme desde la interfaz
para crear una cuenta y luego poder iniciar sesión.

**Why this priority**: El registro es el punto de entrada para nuevos usuarios y es
necesario para que sus operaciones queden asociadas a una identidad.

**Independent Test**: Completar el formulario con datos válidos, confirmar el alta y
verificar que la interfaz permita continuar al login sin mostrar la contraseña.

**Acceptance Scenarios**:

1. **Given** que la persona está en la pantalla de registro, **When** informa un correo
   válido, una contraseña de al menos 8 caracteres y la confirmación coincidente,
   **Then** el formulario permite enviar los datos.
2. **Given** datos de registro válidos, **When** se confirma el formulario, **Then** se
   informa que la cuenta fue creada y se ofrece iniciar sesión.
3. **Given** un correo ya registrado, **When** se intenta crear la cuenta, **Then** se
   muestra un mensaje comprensible y la cuenta no se considera creada nuevamente.
4. **Given** datos incompletos o inválidos, **When** se intenta enviar el formulario,
   **Then** se indican los campos a corregir sin realizar el envío.

---

### User Story 2 - Iniciar sesión (Priority: P1)

Como usuario registrado, quiero iniciar sesión con mi correo y contraseña para acceder a
las funcionalidades protegidas de la aplicación.

**Why this priority**: El login habilita el acceso al mercado y permite que las acciones
posteriores se atribuyan al usuario autenticado.

**Independent Test**: Iniciar sesión con credenciales válidas y comprobar que la interfaz
permita entrar al área autenticada; repetir con credenciales inválidas y comprobar que no
se conceda acceso.

**Acceptance Scenarios**:

1. **Given** una cuenta existente y credenciales válidas, **When** se confirma el login,
   **Then** se inicia una sesión autenticada y se muestra la pantalla inicial protegida.
2. **Given** una contraseña incorrecta o un correo no registrado, **When** se intenta
   iniciar sesión, **Then** se muestra un mensaje genérico de credenciales inválidas y
   no se inicia ninguna sesión.
3. **Given** que el login está procesándose, **When** la persona vuelve a presionar el
   botón, **Then** la interfaz evita envíos duplicados.

---

### User Story 3 - Mantener y cerrar la sesión (Priority: P1)

Como usuario autenticado, quiero conservar mi sesión al recargar la página y poder cerrarla
cuando termine para controlar el acceso a mi cuenta.

**Why this priority**: Una sesión consistente evita que el usuario tenga que autenticarse
en cada navegación y el cierre de sesión protege el acceso desde dispositivos compartidos.

**Independent Test**: Iniciar sesión, recargar la página, comprobar que la sesión válida
continúa; luego cerrar sesión y verificar que las pantallas protegidas ya no sean accesibles.

**Acceptance Scenarios**:

1. **Given** una sesión válida, **When** se recarga la aplicación, **Then** se conserva el
   acceso autenticado.
2. **Given** una sesión inválida, vencida o rechazada por el backend, **When** se intenta
   acceder a una pantalla protegida, **Then** se limpia la sesión y se vuelve al login.
3. **Given** una sesión activa, **When** se selecciona cerrar sesión, **Then** se eliminan
   las credenciales de acceso y se vuelve a una pantalla pública.

### Edge Cases

- El correo contiene espacios al inicio o al final.
- El correo ya está registrado con otra combinación de mayúsculas y minúsculas.
- La contraseña tiene menos de 8 caracteres.
- La confirmación de contraseña no coincide.
- El backend devuelve errores de validación, conflicto o credenciales inválidas.
- El backend no está disponible o la conexión se interrumpe durante el envío.
- La sesión guardada está vencida, alterada o no puede validarse.
- La persona intenta acceder directamente a una ruta protegida sin sesión.
- La persona pulsa varias veces el botón de registro o login.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La interfaz MUST ofrecer una pantalla de registro con correo, contraseña y
  confirmación de contraseña.
- **FR-002**: La interfaz MUST validar el formato del correo, la longitud mínima de la
  contraseña y la coincidencia de la confirmación antes de enviar el formulario.
- **FR-003**: La interfaz MUST mostrar un estado visible de procesamiento y MUST impedir
  envíos duplicados mientras una solicitud esté pendiente.
- **FR-004**: Ante un registro exitoso, la interfaz MUST informar el resultado y MUST
  ofrecer continuar al login sin iniciar una sesión implícita.
- **FR-005**: La interfaz MUST presentar mensajes diferenciados y comprensibles para
  datos inválidos, correo ya registrado, credenciales inválidas y fallas de conexión.
- **FR-006**: La interfaz MUST ofrecer una pantalla de login con correo y contraseña.
- **FR-007**: Ante credenciales válidas, la interfaz MUST iniciar la sesión autenticada y
  MUST permitir acceder a una pantalla protegida de la aplicación.
- **FR-008**: La interfaz MUST enviar la credencial de acceso en las solicitudes protegidas
  posteriores y MUST utilizar la identidad devuelta por el servicio autenticado.
- **FR-009**: La interfaz MUST mostrar un mensaje genérico para credenciales inválidas y
  MUST NOT revelar si el correo informado está registrado.
- **FR-010**: La interfaz MUST conservar una sesión válida al recargar la aplicación y
  MUST redirigir al login cuando el servicio rechace o dé por vencida la sesión.
- **FR-011**: La acción de cerrar sesión MUST eliminar las credenciales de acceso y MUST
  impedir el acceso posterior a las pantallas protegidas.
- **FR-012**: La interfaz MUST NOT mostrar, registrar ni incluir en mensajes de error la
  contraseña ni la credencial completa de acceso.
- **FR-013**: Las pantallas MUST ser utilizables en resoluciones móviles y de escritorio,
  con campos etiquetados, navegación por teclado y foco visible.
- **FR-014**: La interfaz MUST mantener las pantallas de login y registro acotadas a la
  autenticación; el catálogo, el mercado, el ranking y el portfolio quedan fuera de esta
  feature.

### Visual Direction

- **VD-001**: El frontend MUST implementarse como una aplicación Vite + React + TypeScript
  dentro de `frontend/`.
- **VD-002**: El auth MUST presentarse dentro de un marco central blanco con bordes suaves
  sobre un fondo gris claro, siguiendo la referencia de PlayerMarket.
- **VD-003**: El header MUST mostrar la marca PlayerMarket, el claim “EL VALOR DEL FÚTBOL,
  EN TUS MANOS”, enlaces de navegación y el CTA “Iniciar sesión”.
- **VD-004**: El contenido MUST mostrar el formulario de autenticación centrado dentro del
  marco principal, con suficiente espacio vertical y sin panel lateral adicional.
- **VD-005**: El formulario MUST usar la paleta verde de la marca, inputs con iconos,
  mostrar/ocultar contraseña, botón primario de ancho completo, divisor y enlace entre
  login y registro.
- **VD-006**: En mobile, el formulario MUST mantener controles utilizables, márgenes
  consistentes y no producir overflow horizontal.
- **VD-007**: La solución MUST permitir levantar PostgreSQL, backend y frontend con
  `docker compose up --build`, exponiendo el frontend en el puerto `5173` y la API en
  el puerto `3000`.

### Key Entities *(include if feature involves data)*

- **Formulario de registro**: Datos ingresados para crear una cuenta: correo, contraseña
  y confirmación local de contraseña.
- **Formulario de login**: Credenciales que la persona utiliza para autenticarse.
- **Sesión autenticada**: Estado temporal que identifica al usuario y habilita el acceso a
  funcionalidades protegidas hasta su cierre o vencimiento.
- **Mensaje de autenticación**: Información visible sobre éxito, validación, conflicto,
  credenciales inválidas o indisponibilidad del servicio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los formularios con datos inválidos impide el envío y señala qué
  debe corregirse.
- **SC-002**: El 100% de los registros válidos muestra una confirmación y permite
  continuar al login sin exponer la contraseña.
- **SC-003**: El 100% de los logins válidos permite acceder a la pantalla protegida inicial
  y el 100% de los logins inválidos mantiene el acceso bloqueado.
- **SC-004**: El 100% de las sesiones inválidas o vencidas termina en una redirección a una
  pantalla pública sin conservar credenciales utilizables.
- **SC-005**: El 100% de los cierres de sesión impide volver a una pantalla protegida sin
  autenticarse nuevamente.
- **SC-006**: Una persona puede completar registro o login mediante teclado, sin depender
  únicamente de señales de color, en resoluciones móvil y escritorio.
- **SC-007**: La interfaz mantiene la composición visual de la referencia en desktop y
  conserva una versión apilada y legible en mobile.

## Assumptions

- La autenticación se realiza con correo y contraseña, según la feature backend existente.
- El servicio de registro crea la cuenta pero no inicia sesión automáticamente.
- El servicio de login devuelve una credencial temporal, su tipo y su vencimiento.
- La identidad del usuario autenticado se obtiene mediante el servicio protegido de usuario
  actual; el frontend no permite elegir la identidad de otra persona.
- No se incluyen recuperación de contraseña, login social, OAuth, refresh tokens ni roles
  administrativos.
- La pantalla posterior al login puede ser un destino protegido provisional hasta que se
  implemente el resto de la aplicación.
- Los mensajes visibles para el usuario estarán en español.
