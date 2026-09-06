# Feature Specification: App base del backend

**Feature Branch**: No se crea una rama en esta etapa; la funcionalidad se identifica por `specs/001-app-base`.

**Created**: 2026-09-06

**Status**: Draft

**Input**: «Quiero crear la app base del backend. Debe poder instalarse, compilarse y
 ejecutarse localmente, y tener GET /health para comprobar que está funcionando.
 Respetar la constitución. Por ahora no incluir base de datos, autenticación,
 jugadores ni frontend».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instalar, compilar y arrancar el backend (Priority: P1)

Como integrante del equipo, quiero preparar y ejecutar el backend en mi computadora
siguiendo instrucciones del proyecto, para disponer de una base sobre la que desarrollar.

**Why this priority**: El equipo necesita un arranque reproducible antes de agregar funcionalidades.

**Independent Test**: Partir de una copia limpia del repositorio, con los prerrequisitos
instalados, y seguir únicamente las instrucciones de instalación, compilación y ejecución.

**Acceptance Scenarios**:

1. **Given** una copia limpia y los prerrequisitos documentados, **When** se instalan las
   dependencias y se compila, **Then** ambas operaciones terminan correctamente sin editar
   archivos de código ni requerir credenciales.
2. **Given** la aplicación compilada y un puerto disponible, **When** se ejecuta el arranque
   documentado, **Then** el proceso permanece activo e informa dónde consultar el servicio.
3. **Given** un puerto ocupado, **When** se intenta arrancar allí, **Then** el arranque falla
   de forma visible y no anuncia que el servicio está disponible.
4. **Given** el servicio detenido, **When** se lo vuelve a iniciar con la misma configuración
   válida, **Then** vuelve a quedar disponible sin pasos de recuperación ni carga de datos.

### User Story 2 - Comprobar que el servidor responde (Priority: P1)

Como integrante del equipo, quiero consultar el estado del servidor para confirmar que
el backend está ejecutándose y puede atender una petición.

**Why this priority**: Proporciona una comprobación observable del arranque correcto.

**Independent Test**: Con la aplicación activa, consultar `GET /health` sin credenciales
y verificar el estado HTTP, el tipo de contenido y la respuesta.

**Acceptance Scenarios**:

1. **Given** el servidor activo, **When** se consulta `GET /health` sin credenciales ni
   cuerpo, **Then** responde HTTP `200`, contenido JSON y exactamente `{"status":"ok"}`.
2. **Given** el servidor activo sin base de datos ni proveedores externos configurados,
   **When** se consulta `GET /health`, **Then** se obtiene la misma respuesta exitosa.
3. **Given** el servidor activo, **When** se realizan diez consultas consecutivas,
   **Then** todas responden de la misma manera y no modifican estado persistente.
4. **Given** el servidor activo, **When** se consulta una ruta inexistente,
   **Then** se recibe HTTP `404`, sin simular una respuesta de salud exitosa.

### User Story 3 - Consultar instrucciones y probar el endpoint (Priority: P2)

Como integrante del equipo, quiero disponer de documentación y una petición reutilizable
para probar el servicio sin depender de explicaciones fuera del repositorio.

**Why this priority**: Permite compartir y verificar la base con el resto del equipo.

**Independent Test**: Revisar las instrucciones, abrir la documentación del endpoint e
importar la colección de Postman para ejecutar la consulta contra el servicio local.

**Acceptance Scenarios**:

1. **Given** el repositorio, **When** se leen las instrucciones, **Then** se encuentran
   prerrequisitos, instalación, compilación, arranque, detención, configuración local,
   ejecución de tests y forma de consultar el endpoint y su documentación.
2. **Given** el servicio activo, **When** se abre Swagger/OpenAPI, **Then** se puede consultar
   el contrato de `GET /health`, su respuesta exitosa y la ausencia de autenticación.
3. **Given** la colección del proyecto importada en Postman, **When** se configura la
   dirección local y se ejecuta la petición de salud, **Then** se recibe la respuesta
   definida en el contrato.

### Edge Cases

- Puerto ocupado: el proceso MUST informar el fallo; las instrucciones MUST explicar
  cómo seleccionar otro puerto.
- Puerto configurado con un valor inválido: el arranque MUST rechazarlo con un mensaje
  comprensible en español, sin anunciar disponibilidad.
- Configuración opcional ausente: MUST existir una configuración local predeterminada
  documentada que permita arrancar sin secretos.
- Ruta inexistente: MUST responder `404` y no devolver el estado de salud.
- Servidor detenido: la documentación MUST distinguir un error de conexión de una
  respuesta exitosa; el endpoint solo es consultable mientras el proceso está activo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El proyecto MUST permitir instalar sus dependencias desde una copia limpia
  mediante instrucciones reproducibles, con prerrequisitos y versiones compatibles documentados.
- **FR-002**: El backend MUST poder compilarse y ejecutarse localmente mediante los pasos
  documentados, sin requerir cambios en el código fuente.
- **FR-003**: El servicio MUST exponer `GET /health` sin autenticación y responder HTTP `200`
  con contenido JSON exactamente igual a `{"status":"ok"}` cuando está atendiendo peticiones.
- **FR-004**: La consulta de salud MUST limitarse a comprobar que el servidor responde,
  sin consultar ni requerir bases de datos, credenciales o servicios externos y sin persistir datos.
- **FR-005**: El puerto MUST ser configurable, con un valor predeterminado documentado.
  El arranque MUST informar fallos de configuración o puerto ocupado y no anunciar éxito
  cuando no puede atender peticiones.
- **FR-006**: El repositorio MUST incluir instrucciones en español para preparar, compilar,
  iniciar, detener, configurar y verificar el servicio, ejecutar tests y resolver los errores
  de arranque contemplados.
- **FR-007**: El endpoint MUST estar documentado en Swagger/OpenAPI y disponible en una
  colección de Postman del proyecto con dirección del servicio configurable.
- **FR-008**: Las rutas no definidas MUST responder HTTP `404`.
- **FR-009**: La entrega MUST incluir tests unitarios y de integración con casos felices
  y borde y evidencia de ejecución, compilación y arranque conforme a la constitución.
  MUST NOT modificarse ni eliminarse tests existentes sin el «sí» explícito de la usuaria.
- **FR-010**: Esta funcionalidad MUST NOT incorporar base de datos, autenticación,
  jugadores, frontend ni integraciones externas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un integrante con los prerrequisitos instalados completa instalación,
  compilación y arranque desde una copia limpia siguiendo solo la documentación,
  sin cambios de código ni instrucciones adicionales.
- **SC-002**: Diez comprobaciones consecutivas con el servidor activo obtienen la respuesta
  de salud esperada; la misma comprobación funciona después de detener y reiniciar el servicio.
- **SC-003**: Los dos escenarios de fallo de arranque definidos (puerto ocupado e inválido)
  resultan en un fallo visible, sin un anuncio falso de disponibilidad.
- **SC-004**: El equipo puede verificar el endpoint tanto desde su documentación interactiva
  como desde la colección compartida, y ambas describen el mismo contrato.
- **SC-005**: El 100 % de los tests definidos para el alcance pasan y quedan registradas las
  verificaciones de instalación, compilación, arranque y contrato antes de declarar terminada
  la implementación.

## Assumptions

- El actor de esta funcionalidad es un integrante del equipo de desarrollo.
- La instalación inicial requiere acceso a la fuente de dependencias; el arranque y la
  consulta de salud no requieren proveedores externos.
- Se adopta `200` y `{"status":"ok"}` como contrato mínimo de salud, conforme al alcance
  discutido. El valor técnico `ok` no es un mensaje de error.
- Las decisiones de stack y capas ya están establecidas en la constitución y se concretarán
  en el plan; esta especificación no define estructura de carpetas, clases ni librerías.
- No existen entidades de negocio ni información persistente en este alcance.
- Swagger/OpenAPI, Postman y tests forman parte del entregable por la constitución.
- La constitución 2.0.0, con aclaración autorizada por la usuaria, exige tests de
  integración de los componentes involucrados sin base de datos cuando no hay persistencia.
  Este incremento aplicará esa regla; PostgreSQL/Testcontainers se reserva para persistencia.
- La organización del paquete end to end sigue pendiente según la constitución; no se
  asume aquí su implementación ni se mezclan esos tests con tests de Service.
- Este incremento prepara el backend y no completa por sí solo la primera entrega del TP.
