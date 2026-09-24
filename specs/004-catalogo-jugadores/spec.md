# Feature Specification: Catálogo base de jugadores

**Feature Branch**: `004-catalogo-jugadores`

**Created**: 2026-09-22

**Status**: Draft

**Input**: Implementar únicamente la Parte 1 del catálogo base de jugadores, respetando
las decisiones del documento de contexto adjunto y dejando WhoScored y las estadísticas
para una segunda especificación.

## Contexto de producto

Esta feature forma parte de Football Player Market. El contexto general y las invariantes
del producto están definidos en [docs/product.md](../../docs/product.md) y en la
constitución del proyecto. El documento de contexto establece a Football-Data.org como
fuente inicial de ligas, equipos y jugadores, y reserva WhoScored para una etapa posterior
de estadísticas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Actualizar el catálogo base (Priority: P1)

Como integrante autorizado del sistema, quiero iniciar una actualización del catálogo para
incorporar la información base vigente de las ligas, equipos y jugadores desde la fuente
definida, para que las consultas posteriores dispongan de datos locales.

**Why this priority**: Es la única carga prevista para poblar el catálogo inicial y debe
existir antes de que los usuarios puedan consultarlo.

**Independent Test**: Proveer una respuesta de fuente con ligas, equipos y jugadores,
ejecutar `POST /catalog/refresh` y verificar que el catálogo queda disponible mediante
consultas locales.

**Acceptance Scenarios**:

1. **Given** una fuente disponible con datos válidos, **When** se inicia la actualización,
   **Then** se guardan o actualizan las ligas, equipos y jugadores base y se informa un
   resumen de cantidades procesadas.
2. **Given** un catálogo ya cargado, **When** se repite la actualización con los mismos
   identificadores externos, **Then** no se crean duplicados y se conserva el identificador
   interno estable de cada jugador.
3. **Given** que la fuente no está disponible, **When** se inicia la actualización,
   **Then** la operación informa el error sin borrar ni dejar parcialmente actualizado el
   catálogo local existente.
4. **Given** la primera etapa del catálogo, **When** se ejecuta la actualización, **Then**
   solo se importan datos base desde Football-Data.org y no se solicitan estadísticas ni
   datos de WhoScored.

---

### User Story 2 - Consultar el catálogo (Priority: P1)

Como usuario del sistema, quiero listar los jugadores disponibles para conocer el catálogo
local sin esperar ni depender de una consulta a proveedores externos.

**Why this priority**: Es la lectura principal que habilita el uso del catálogo y debe
seguir funcionando aun cuando la fuente externa esté caída.

**Independent Test**: Cargar datos locales, consultar `GET /players` con la fuente externa
inaccesible y verificar la respuesta y sus relaciones de liga y equipo.

**Acceptance Scenarios**:

1. **Given** jugadores persistidos localmente, **When** se consulta `GET /players`,
   **Then** responde el catálogo base con el identificador interno, nombre, equipo y liga
   de cada jugador sin realizar llamadas externas.
2. **Given** que no hay jugadores persistidos, **When** se consulta `GET /players`,
   **Then** responde una lista vacía con estado exitoso.
3. **Given** datos persistidos, **When** el proveedor externo está caído, **Then** la
   consulta mantiene el mismo resultado local y no falla por esa indisponibilidad.

---

### User Story 3 - Consultar el detalle de un jugador (Priority: P2)

Como usuario del sistema, quiero consultar el detalle de un jugador por su identificador
interno para conocer sus datos base y la pertenencia a su equipo y liga.

**Why this priority**: Permite identificar de forma inequívoca un jugador y prepara las
consultas de estadísticas de la segunda especificación sin exponer el identificador del
proveedor como identidad principal.

**Independent Test**: Obtener un jugador conocido por `GET /players/:id` y consultar un
identificador inexistente para verificar ambos resultados.

**Acceptance Scenarios**:

1. **Given** un jugador persistido, **When** se consulta `GET /players/:id` con su
   identificador interno válido, **Then** responde sus datos base, equipo y liga.
2. **Given** un identificador interno inexistente o con formato inválido, **When** se
   consulta el detalle, **Then** responde un error de recurso no encontrado o de entrada
   inválida, sin consultar fuentes externas.

### Edge Cases

- La fuente devuelve una liga, equipo o jugador sin nombre obligatorio: la actualización
  debe rechazar esos datos y no persistir un catálogo parcial.
- La fuente repite un equipo o jugador entre competencias: debe conservarse un único
  registro por identificador externo y una relación consistente.
- Un jugador ya existente cambia de equipo o de atributos base: la actualización debe
  actualizar esos datos sin cambiar su identificador interno.
- La fuente responde con estado de error, JSON inválido o demora agotada: debe informarse
  la falla y conservarse el último catálogo consistente.
- Se solicita un identificador inexistente o vacío: no deben realizarse llamadas externas
  ni devolverse datos de otro jugador.
- El catálogo contiene caracteres internacionales en nombres: deben conservarse en la
  respuesta y en la persistencia, aunque los identificadores del código no lleven acentos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST modelar las entidades de liga, equipo y jugador con sus
  relaciones: una liga puede tener varios equipos y un equipo puede tener varios jugadores.
- **FR-002**: El sistema MUST mantener un identificador interno estable para cada jugador,
  independiente del identificador entregado por la fuente externa.
- **FR-003**: El sistema MUST persistir localmente nombres, identificadores externos y
  relaciones de ligas, equipos y jugadores, conservando la información entre reinicios.
- **FR-004**: El sistema MUST limitar la primera etapa a las cinco competencias de producto:
  Premier League, Bundesliga, La Liga, Serie A y Ligue 1.
- **FR-005**: `POST /catalog/refresh` MUST aceptar opcionalmente `ligaCodigo` para iniciar
  la importación de una liga, sus equipos y jugadores base desde Football-Data.org, y MUST
  devolver un resumen de la actualización.
- **FR-006**: La actualización MUST ser repetible y no MUST crear duplicados para un mismo
  identificador externo; las relaciones y atributos actuales deben poder actualizarse.
- **FR-007**: La actualización MUST ser atómica respecto del catálogo: una falla de la
  fuente o de validación MUST NOT borrar ni dejar expuestos datos parcialmente importados.
- **FR-008**: La primera etapa MUST NOT consultar WhoScored, importar estadísticas ni
  modificar el endpoint futuro `GET /players/:id/estadisticas`.
- **FR-009**: `GET /players` MUST devolver únicamente información persistida localmente,
  sin llamar a proveedores externos, y MUST devolver una lista vacía si no hay registros.
- **FR-010**: `GET /players/:id` MUST devolver el jugador y sus relaciones persistidas, y
  MUST responder recurso no encontrado cuando el identificador interno no existe.
- **FR-011**: Los DTOs de entrada y salida MUST validar forma, tipos y límites de la API;
  las reglas de identidad y consistencia MUST permanecer en el dominio y los servicios.
- **FR-012**: Los endpoints nuevos MUST estar documentados en Swagger/OpenAPI en español,
  incluyendo respuestas exitosas, validación, autenticación y errores relevantes.
- **FR-013**: La funcionalidad MUST incluir tests unitarios del dominio, del adapter y de
  los servicios, además de tests de integración de persistencia y API, sin modificar ni
  eliminar tests existentes.

### Key Entities

- **Liga**: competencia de producto identificada internamente y por el código de la fuente;
  contiene nombre y los equipos que participan.
- **Equipo**: club perteneciente a una liga, identificado por un identificador interno y
  otro de la fuente; contiene nombre, nombre corto, sigla y escudo cuando estén disponibles.
- **Jugador**: persona del catálogo base perteneciente a un equipo; contiene identificador
  interno estable, identificador externo, nombre, posición, fecha de nacimiento y
  nacionalidad cuando estén disponibles.
- **Catálogo base**: conjunto consistente de ligas, equipos y jugadores producido por una
  actualización; no incluye estadísticas ni valuaciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una actualización válida deja disponibles el 100 % de las ligas, equipos y
  jugadores válidos recibidos, sin duplicados por identificador externo.
- **SC-002**: El 100 % de las consultas de listado y detalle se resuelve con datos locales,
  incluso cuando la fuente externa no responde.
- **SC-003**: Repetir dos veces una misma actualización conserva el 100 % de los
  identificadores internos de jugadores y no aumenta la cantidad de registros.
- **SC-004**: El 100 % de las fallas de fuente o validación probadas conserva el último
  catálogo consistente y comunica un error accionable.
- **SC-005**: El 100 % de los endpoints de esta feature aparece en Swagger/OpenAPI con un
  contrato verificable y los tests definidos para el alcance pasan.

## Assumptions

- Los cinco códigos de competencia se configuran como `PL`, `BL1`, `PD`, `SA` y `FL1`.
- Football-Data.org entrega la plantilla vigente de cada equipo mediante sus recursos de
  competencias y equipos; la actualización trabaja con la temporada actual que devuelve
  la fuente.
- `GET /players` y `GET /players/:id` son lecturas públicas del catálogo; `POST
  /catalog/refresh` requiere autenticación Bearer y no define roles administrativos en esta
  etapa.
- Una actualización fallida no elimina registros que ya estaban disponibles; la operación
  escribe el conjunto recibido de forma transaccional.
- Los campos opcionales ausentes en la fuente se persisten como nulos y no impiden importar
  un jugador cuyo identificador y nombre sean válidos.
- La segunda especificación podrá agregar `EstadisticasJugador`, `WhoScoredAdapter` y
  `GET /players/:id/estadisticas` sobre la estructura de este módulo, sin que esta feature
  los implemente.
