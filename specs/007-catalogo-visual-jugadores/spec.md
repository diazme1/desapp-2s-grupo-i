# Feature Specification: Catálogo visual de jugadores

**Feature Branch**: `feat/front-catalogo`

**Created**: 2026-09-27

**Status**: Draft

**Input**: Crear una pantalla web para consultar, filtrar y explorar visualmente el catálogo de jugadores, con acceso opcional a sus estadísticas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el catálogo visual (Priority: P1)

Como usuario autenticado, quiero ver el catálogo de jugadores en una pantalla visual para conocer rápidamente los jugadores disponibles, su equipo y su liga.

**Why this priority**: Es el flujo principal de la feature y permite utilizar el catálogo existente desde la aplicación web.

**Independent Test**: Con jugadores persistidos, acceder a la pantalla del catálogo y comprobar manualmente que se muestra el título y una card por cada jugador disponible.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado y un catálogo con jugadores, **When** accede a la pantalla, **Then** visualiza el título “Catálogo de jugadores” y una grilla de cards.
2. **Given** un jugador con datos completos, **When** se muestra su card, **Then** la card muestra su nombre, equipo, liga, posición cuando exista y el indicador de disponibilidad de estadísticas.
3. **Given** un jugador sin foto disponible, **When** se muestra su card, **Then** se muestra una imagen alternativa o placeholder sin romper la grilla.
4. **Given** que el usuario no está autenticado, **When** intenta acceder a la pantalla protegida, **Then** se aplica el comportamiento existente de autenticación de la aplicación.

---

### User Story 2 - Filtrar jugadores (Priority: P1)

Como usuario autenticado, quiero buscar y filtrar jugadores para encontrar rápidamente los que me interesan.

**Why this priority**: El catálogo puede contener muchos jugadores y los filtros son necesarios para que la consulta sea útil.

**Independent Test**: Cargar un catálogo con jugadores de distintos nombres, equipos, ligas y estados de estadísticas, aplicar filtros y verificar manualmente que solo permanecen las cards correspondientes.

**Acceptance Scenarios**:

1. **Given** un catálogo visible, **When** el usuario ingresa parte del nombre de un jugador, **Then** se muestran únicamente las cards que coinciden con la búsqueda.
2. **Given** un catálogo con varias ligas y equipos, **When** el usuario selecciona una liga o equipo, **Then** se muestran únicamente los jugadores que pertenecen a la selección.
3. **Given** jugadores con y sin estadísticas, **When** el usuario filtra por disponibilidad de estadísticas, **Then** se muestran únicamente los jugadores del estado seleccionado.
4. **Given** uno o más filtros aplicados, **When** el usuario los limpia o restablece, **Then** vuelve a visualizar el catálogo completo.
5. **Given** una combinación de filtros sin coincidencias, **When** se actualiza el resultado, **Then** se muestra un estado vacío claro y una acción para limpiar los filtros.

---

### User Story 3 - Consultar estadísticas disponibles (Priority: P2)

Como usuario autenticado, quiero seleccionar un jugador con estadísticas disponibles para consultar su detalle.

**Why this priority**: Permite aprovechar los datos obtenidos desde WhoScored sin impedir la consulta del catálogo cuando esos datos no existen.

**Independent Test**: Seleccionar manualmente un jugador con estadísticas, comprobar el estado de carga y verificar que el detalle muestra los datos que devuelve el backend.

**Acceptance Scenarios**:

1. **Given** un jugador con estadísticas disponibles, **When** el usuario selecciona su card, **Then** se solicita su detalle mediante `GET /players/:id` y se muestra la información recibida.
2. **Given** estadísticas parciales, **When** se muestra el detalle, **Then** se muestran los valores disponibles y se identifican explícitamente los datos ausentes.
3. **Given** una estadística válida cuyo valor sea cero, **When** se muestra el detalle, **Then** se presenta como cero y no como dato faltante.
4. **Given** que el endpoint todavía no devuelve estadísticas, **When** el usuario consulta el detalle, **Then** se muestra un estado de estadísticas no disponibles y la pantalla permanece válida y comprensible.

---

### User Story 4 - Manejar ausencia o error de estadísticas (Priority: P2)

Como usuario autenticado, quiero saber cuándo un jugador no tiene estadísticas disponibles para no interpretar una pantalla vacía como un error del catálogo.

**Why this priority**: Las estadísticas se están terminando de exponer en el backend y su ausencia es un estado válido durante esta etapa.

**Independent Test**: Usar jugadores sin estadísticas y respuestas vacías, con error o inexistentes del endpoint para comprobar que el catálogo sigue funcionando y que el usuario recibe un mensaje claro.

**Acceptance Scenarios**:

1. **Given** un jugador sin estadísticas, **When** se muestra su card, **Then** la card indica “Estadísticas no disponibles” y no ofrece una navegación inválida.
2. **Given** una respuesta vacía, error, 404 o indisponibilidad temporal de `GET /players/:id`, **When** se intenta consultar el detalle, **Then** se informa que no hay estadísticas disponibles y se permite volver al catálogo.
3. **Given** que falla la consulta de estadísticas de un jugador, **When** el usuario vuelve al catálogo, **Then** el resto del catálogo continúa disponible.

### Edge Cases

- El catálogo no contiene jugadores: se muestra un estado vacío informativo.
- La consulta del catálogo falla: se muestra un mensaje de error accionable y una opción para reintentar.
- La búsqueda o combinación de filtros no produce resultados: se informa claramente y se permite limpiar los filtros.
- Un jugador no tiene foto, posición u otro dato opcional: la card conserva su estructura y muestra un reemplazo textual o visual adecuado.
- La respuesta de estadísticas es parcial, vacía, inválida, demora o devuelve un recurso inexistente: el detalle informa que las estadísticas no están disponibles sin mostrar una pantalla vacía.
- Un jugador tiene una estadística con valor cero: se muestra cero y no se confunde con ausencia de información.
- El usuario activa repetidamente una card mientras se consultan estadísticas: no se generan navegaciones duplicadas ni estados inconsistentes.
- Se accede directamente a un detalle de jugador sin estadísticas: se muestra el estado de ausencia y una forma clara de regresar al catálogo.
- El usuario navega usando teclado: los controles de filtros y las cards seleccionables tienen foco visible y una acción comprensible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La aplicación MUST permitir que un usuario autenticado acceda a la pantalla web “Catálogo de jugadores” reutilizando el mecanismo de autenticación existente.
- **FR-002**: La pantalla MUST mostrar los jugadores disponibles en una grilla de cards, sin requerir una actualización externa del catálogo.
- **FR-003**: Cada card MUST mostrar nombre, equipo, liga, posición cuando esté disponible y un indicador comprensible sobre la disponibilidad de estadísticas.
- **FR-004**: Cada card MUST mostrar una foto del jugador cuando exista y un placeholder o imagen alternativa cuando no exista.
- **FR-005**: La pantalla MUST permitir buscar jugadores por nombre y filtrar por liga, equipo y disponibilidad de estadísticas.
- **FR-006**: Los filtros MUST poder combinarse y MUST ofrecer una acción visible para limpiarlos o restablecerlos.
- **FR-007**: La pantalla MUST mostrar estados diferenciados para carga, catálogo vacío, resultado sin coincidencias, error de consulta y jugador sin imagen.
- **FR-008**: Una card con estadísticas disponibles MUST permitir iniciar la consulta del detalle del jugador.
- **FR-009**: La consulta del detalle MUST utilizar el jugador seleccionado y el endpoint `GET /players/:id` como dependencia de datos para obtener sus estadísticas cuando el contrato del backend las exponga.
- **FR-010**: Si `GET /players/:id` no existe todavía, devuelve una respuesta vacía, no incluye estadísticas, devuelve un error, responde 404 o está temporalmente indisponible, la aplicación MUST mostrar “Estadísticas no disponibles” o un mensaje equivalente y MUST permitir regresar al catálogo.
- **FR-011**: El detalle MUST distinguir estadísticas completas, parciales y ausentes; los valores disponibles MUST mostrarse y los campos ausentes MUST identificarse explícitamente.
- **FR-012**: Un valor estadístico igual a cero MUST mostrarse como cero y MUST NOT tratarse como un dato ausente.
- **FR-013**: Un jugador sin estadísticas MUST permanecer visible en el catálogo y su card MUST NOT conducir a una pantalla de detalle inválida.
- **FR-014**: La interfaz MUST permitir la navegación mediante teclado en filtros, acciones de limpieza, cards seleccionables y acciones de retorno.
- **FR-015**: La feature MUST limitarse a la experiencia web de escritorio en esta iteración y MUST NOT incluir soporte mobile.
- **FR-016**: La feature MUST reutilizar el catálogo y la autenticación existentes y MUST NOT implementar la carga o actualización de ligas, equipos o jugadores.
- **FR-017**: La feature MUST NOT inventar fotos, estadísticas ni valores faltantes que no estén disponibles en los datos recibidos.
- **FR-018**: No se incluyen tests automatizados de frontend en esta iteración, de acuerdo con el alcance solicitado; la validación inicial será manual sobre los escenarios de aceptación definidos.

### Key Entities *(include if feature involves data)*

- **Jugador de catálogo**: jugador persistido que se muestra con identificador, nombre, foto cuando exista, posición, equipo y liga.
- **Equipo**: club al que pertenece el jugador y que permite identificar y filtrar el catálogo.
- **Liga**: competencia a la que pertenece el equipo y que permite identificar y filtrar el catálogo.
- **Estado de estadísticas**: estado visible que distingue estadísticas completas, parciales, ausentes, vacías o no disponibles por error.
- **Detalle de estadísticas**: información de rendimiento asociada a un jugador y devuelta por el backend cuando esté disponible; puede contener valores válidos y campos ausentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una consulta exitosa, el 100 % de los jugadores entregados por el catálogo se representa en una card, salvo los que sean excluidos por filtros activos.
- **SC-002**: En el 100 % de los escenarios de búsqueda y filtrado definidos, el resultado contiene únicamente jugadores que cumplen los criterios seleccionados.
- **SC-003**: En el 100 % de los casos de jugadores sin foto, datos opcionales o estadísticas, la card conserva una presentación válida y comunica la ausencia sin romper la pantalla.
- **SC-004**: En el 100 % de las respuestas vacías, parciales, erróneas, 404 o temporalmente indisponibles de estadísticas, el usuario recibe un estado comprensible y puede regresar al catálogo sin perder la navegación principal.
- **SC-005**: Un usuario puede identificar un jugador por nombre, liga o equipo y llegar a una card coincidente en menos de 30 segundos en una prueba manual con un catálogo de al menos 50 jugadores.
- **SC-006**: El 100 % de las acciones principales de la pantalla —aplicar filtros, limpiarlos, seleccionar un jugador con estadísticas y regresar— puede ejecutarse mediante teclado con foco visible.
- **SC-007**: La pantalla inicial comunica su estado de carga, resultado o error en un tiempo máximo de 3 segundos después de recibir la respuesta del catálogo.

## Assumptions

- El usuario ya inició sesión y cuenta con permisos para consultar el catálogo.
- El catálogo base ya fue cargado y se consulta desde la información local disponible.
- La autenticación existente se reutiliza y no se rediseña en esta feature.
- La disponibilidad real de estadísticas depende de que el backend termine de exponerlas mediante `GET /players/:id`.
- Mientras el endpoint no entregue estadísticas, la ausencia de datos es un estado válido y no bloquea la visualización del catálogo.
- Cuando el backend no entregue una foto de jugador, se utiliza un placeholder; no se incorpora una fuente externa nueva de imágenes dentro de esta feature.
- Los filtros pueden resolverse con la información disponible para la pantalla; la especificación no fija si se procesan localmente o mediante una ampliación del backend.
- La primera versión se valida manualmente y no agrega tests automatizados de frontend.

## Alcance y exclusiones

Incluye la pantalla web de catálogo, sus cards, filtros, estados de interfaz, navegación al detalle y manejo de estadísticas disponibles, parciales o ausentes.

Queda fuera de alcance:

- soporte mobile;
- carga o actualización del catálogo;
- modificación del proceso de scraping o persistencia de estadísticas;
- creación de rankings, comparaciones, recomendaciones o favoritos;
- edición de jugadores, equipos o ligas;
- incorporación de una fuente externa de fotos;
- implementación del endpoint backend de estadísticas si todavía no existe;
- tests automatizados de frontend en esta iteración.
