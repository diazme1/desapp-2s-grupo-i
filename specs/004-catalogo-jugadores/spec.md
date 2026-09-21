# Feature Specification: Catálogo de jugadores

**Feature Branch**: 004-catalogo-jugadores

**Created**: 2026-09-20

**Status**: Draft

**Input**: Crear el modelo, la persistencia y los endpoints de consulta del catálogo
de jugadores para las cinco ligas requeridas. Esta feature no implementa scraping;
la feature posterior de scraping dependerá de este modelo y de su contrato de
importación.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el catálogo de jugadores (Priority: P1)

Como consumidor de la API, quiero consultar el catálogo de jugadores para conocer
qué jugadores están disponibles en las cinco ligas requeridas.

**Why this priority**: El catálogo es la primera capacidad funcional del producto y
constituye la base para las cotizaciones y operaciones futuras.

**Independent Test**: Cargar datos válidos de jugadores en la persistencia local y
consultar el endpoint de listado sin depender de proveedores externos.

**Acceptance Scenarios**:

1. **Given** jugadores activos persistidos de las cinco ligas, **When** se consulta
   GET /players sin filtros, **Then** se devuelve HTTP 200 con todos los jugadores
   activos ordenados por nombre y el total de resultados.
2. **Given** jugadores de distintas ligas, equipos y posiciones, **When** se consulta
   GET /players con un filtro de liga, equipo o posición, **Then** solo se devuelven
   los jugadores que coinciden con ese filtro.
3. **Given** más de un filtro válido, **When** se consulta el catálogo, **Then** todos
   los filtros se aplican conjuntamente y el resultado coincide con la intersección
   de sus condiciones.
4. **Given** filtros válidos sin coincidencias, **When** se consulta el catálogo,
   **Then** se devuelve HTTP 200 con una colección vacía y total igual a cero.

---

### User Story 2 - Consultar el detalle de un jugador (Priority: P1)

Como consumidor de la API, quiero consultar el detalle de un jugador para conocer
su identidad, posición, equipo y liga actuales.

**Why this priority**: El detalle permite validar la información de un jugador
seleccionado desde el catálogo y será utilizado por funcionalidades posteriores.

**Independent Test**: Persistir un jugador válido, consultar su identificador y
comparar la respuesta con los datos almacenados.

**Acceptance Scenarios**:

1. **Given** un jugador activo persistido, **When** se consulta GET /players/:id con
   su identificador, **Then** se devuelve HTTP 200 con el contrato de detalle.
2. **Given** un identificador que no corresponde a un jugador visible, **When** se
   consulta GET /players/:id, **Then** se devuelve HTTP 404 con un mensaje en español
   y no se expone información de otro jugador.
3. **Given** un identificador vacío o con formato inválido, **When** se consulta el
   detalle, **Then** se devuelve HTTP 400 sin consultar datos de otro recurso.

---

### User Story 3 - Mantener un modelo consistente para futuras importaciones (Priority: P1)

Como integrante del equipo, quiero que cada jugador tenga una identidad estable y
una relación consistente con su equipo y liga para poder importar datos de proveedores
externos en una feature posterior sin duplicar jugadores.

**Why this priority**: El scraper futuro debe poder identificar y actualizar jugadores
sin romper el catálogo ni crear registros duplicados.

**Independent Test**: Intentar persistir dos registros con la misma combinación de
proveedor y externalId y verificar que el segundo no cree un jugador adicional.

**Acceptance Scenarios**:

1. **Given** una identidad externa ya asociada a un jugador, **When** se intenta
   asociarla a otro jugador, **Then** la operación se rechaza sin crear un duplicado.
2. **Given** un equipo asociado a una liga, **When** se intenta guardar un jugador
   con ese equipo y otra liga, **Then** la operación se rechaza por inconsistencia.
3. **Given** un proveedor externo no disponible, **When** se consulta el catálogo,
   **Then** la lectura utiliza los datos locales y no falla por la ausencia del proveedor.

---

### User Story 4 - Consultar el contrato del catálogo (Priority: P2)

Como integrante del equipo, quiero disponer de documentación y una petición
reutilizable para verificar el catálogo sin depender de explicaciones externas.

**Why this priority**: Permite demostrar la primera entrega y facilita el consumo
del endpoint por el frontend futuro.

**Independent Test**: Abrir la documentación del endpoint e importar la colección
Postman para consultar el listado y el detalle.

**Acceptance Scenarios**:

1. **Given** el servicio disponible, **When** se consulta la documentación del catálogo,
   **Then** se observan filtros, respuestas exitosas y errores definidos.
2. **Given** la colección Postman importada, **When** se ejecutan las peticiones del
   catálogo contra datos locales, **Then** las respuestas coinciden con el contrato.

### Edge Cases

- El catálogo no contiene jugadores activos.
- Una liga, equipo o posición indicada como filtro no existe.
- Un filtro está vacío, contiene solo espacios o supera el tamaño permitido.
- Se envían dos o más filtros y no existe una coincidencia conjunta.
- Se intenta persistir un jugador sin nombre, posición, equipo o liga.
- Se intenta persistir un jugador con una identidad externa duplicada.
- El equipo y la liga informados no tienen una relación válida.
- Existen jugadores inactivos persistidos: no deben aparecer en el listado ni en el
  detalle público de esta feature.
- El proveedor externo está caído: los endpoints de lectura no deben intentar
  conectarse ni fallar por ese motivo.
- Se consulta una ruta de catálogo inexistente: debe responder 404.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST persistir ligas, equipos y jugadores del catálogo de
  forma local para que las lecturas no dependan de un proveedor externo disponible.
- **FR-002**: El sistema MUST soportar las ligas Premier League, Bundesliga, La Liga,
  Serie A y Ligue 1, con una identificación estable para cada liga.
- **FR-003**: Cada jugador MUST tener un identificador interno estable, nombre,
  posición, equipo actual, liga actual, estado y fecha de actualización.
- **FR-004**: Cada jugador importable MUST poder asociarse a una identidad externa
  compuesta por proveedor y externalId; la combinación MUST ser única.
- **FR-005**: El sistema MUST impedir jugadores sin nombre, posición, equipo o liga,
  y MUST impedir que un equipo pertenezca simultáneamente a ligas incompatibles.
- **FR-006**: El sistema MUST exponer GET /players para listar los jugadores activos.
- **FR-007**: GET /players MUST aceptar los filtros opcionales liga, equipo y posición.
- **FR-008**: Los filtros enviados MUST recortarse y compararse sin distinguir
  mayúsculas de minúsculas; los filtros múltiples MUST aplicarse conjuntamente.
- **FR-009**: GET /players MUST devolver HTTP 200 con un objeto que contenga items y
  total; items MUST contener los jugadores coincidentes ordenados por nombre ascendente
  y, ante empate, por identificador ascendente.
- **FR-010**: GET /players/:id MUST devolver HTTP 200 con el detalle del jugador activo
  solicitado y HTTP 404 cuando el jugador no exista o no sea visible.
- **FR-011**: Los parámetros inválidos, vacíos o no normalizables MUST devolver HTTP 400
  con un mensaje comprensible en español.
- **FR-012**: Las lecturas del catálogo MUST utilizar los datos locales y MUST NOT
  requerir llamadas a WhoScored, Football-Data.org u otro proveedor externo durante
  cada consulta. Esta regla no impide que una feature posterior cargue o actualice
  previamente los datos mediante un Adapter.
- **FR-013**: La feature MUST dejar documentado un contrato de importación posterior
  que permita utilizar proveedor y externalId sin acoplar el dominio a un proveedor
  ni a la estructura de respuesta de una fuente externa.
- **FR-014**: Los endpoints del catálogo MUST documentarse en OpenAPI/Swagger,
  incluyendo parámetros, respuestas exitosas y errores.
- **FR-015**: La colección Postman del proyecto MUST incluir peticiones para el listado
  sin filtros, el listado filtrado y el detalle de un jugador.
- **FR-016**: La feature MUST incluir tests unitarios del dominio y tests de integración
  de los componentes que utilizan persistencia, con casos felices y de borde.
- **FR-017**: La implementación MUST respetar la constitución del proyecto, mantener
  el dominio independiente de HTTP e infraestructura y no modificar ni eliminar tests
  existentes sin autorización explícita.

### Contrato observable del catálogo

GET /players acepta los siguientes parámetros opcionales:

| Parámetro | Significado | Regla |
|-----------|-------------|-------|
| liga | UUID interno o código canónico de la liga | Coincidencia exacta después de normalizar |
| equipo | UUID interno o nombre canónico del equipo | Coincidencia exacta después de normalizar |
| posicion | Código o nombre canónico de la posición | Coincidencia exacta después de normalizar |

Todos los parámetros son `string`, opcionales y tienen un máximo de 100 caracteres.
Los valores se recortan y comparan sin distinguir mayúsculas de minúsculas. Un valor
vacío, compuesto solo por espacios o con formato inválido devuelve HTTP 400. Un valor
correctamente formado pero sin coincidencias devuelve HTTP 200 con `items: []` y
`total: 0`. Los filtros enviados conjuntamente se aplican con operador AND.

El parámetro `id` de GET /players/:id es un UUID. Un valor que no tenga formato UUID
devuelve HTTP 400; un UUID válido que no corresponda a un jugador activo devuelve
HTTP 404.

La respuesta exitosa de GET /players tiene esta forma lógica:

| Campo | Regla |
|-------|------|
| items | Colección de jugadores activos que coinciden con los filtros |
| total | Cantidad de elementos incluidos en items |

Cada elemento de items contiene:

| Campo | Regla |
|-------|------|
| id | UUID interno estable |
| nombre | Nombre visible del jugador |
| posicion | Posición normalizada |
| equipo | Identificador y nombre del equipo actual |
| liga | Identificador, nombre y código de la liga actual |
| activo | Debe ser true para aparecer en el catálogo |
| actualizadoEn | Fecha/hora UTC de la última actualización en formato ISO 8601 |

Ejemplo lógico de respuesta exitosa:

```json
{
  "items": [
    {
      "id": "8d7f4d9e-5e99-4af2-9c6d-2cf02f5b3a11",
      "nombre": "Nombre del jugador",
      "posicion": "delantero",
      "equipo": {
        "id": "2f7c6c45-9f24-4e28-b7b5-37ec4e80e9f4",
        "nombre": "Equipo"
      },
      "liga": {
        "id": "c4d4f227-bb9d-4b1f-a3e7-6b0b36f182a2",
        "codigo": "premier-league",
        "nombre": "Premier League"
      },
      "activo": true,
      "actualizadoEn": "2026-09-20T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

La respuesta de GET /players/:id utiliza el mismo objeto de jugador y no expone
externalId ni detalles internos del proveedor. La identidad externa se conserva
para la persistencia y para la futura importación.

Las respuestas de error deben incluir un mensaje en español y no deben exponer
stack traces, consultas internas ni información de otros jugadores.

### Contrato de importación para la futura feature de scraping

La feature posterior de scraping MUST transformar cualquier respuesta externa a un
registro canónico antes de persistirlo. El modelo de esta feature no debe conocer
HTML, selectores ni el formato propio de WhoScored u otra fuente.

El registro canónico mínimo para importar o actualizar un jugador debe contener:

| Campo | Regla |
|-------|-------|
| proveedor | Identificador estable y no vacío de la fuente, por ejemplo `whoscored` |
| externalId | Identificador no vacío del jugador en esa fuente |
| nombre | Nombre visible no vacío |
| posicion | Posición normalizada no vacía |
| liga | Código o nombre canónico de una de las cinco ligas soportadas |
| equipo | Nombre o identificador canónico del equipo actual |
| activo | Estado calculado por la importación |
| actualizadoEn | Fecha/hora de obtención o actualización |

`proveedor` y `externalId` forman la identidad externa y son la clave de
idempotencia. La futura feature de scraping será responsable de mapear los
identificadores externos de liga y equipo a las entidades locales. Esta feature
solo define el contrato y sus invariantes; no agrega un endpoint de importación ni
implementa el Adapter o el scraper.

### Key Entities *(include if feature involves data)*

- **Liga**: Competencia admitida por el catálogo. Tiene un UUID estable, nombre y código
  único dentro de las ligas soportadas.
- **Equipo**: Club al que pertenece actualmente un jugador. Tiene un UUID estable,
  nombre canónico y una liga asociada.
- **Jugador**: Persona que aparece en el catálogo. Tiene un UUID interno estable,
  nombre, posición, equipo, liga, estado y fecha de actualización.
- **Identidad externa del jugador**: Asociación entre un jugador, un proveedor y un
  externalId. La combinación proveedor-externalId es única y permite futuras
  importaciones idempotentes.

### Reglas de unicidad y consistencia

- El código de una liga es único.
- El nombre canónico de un equipo es único dentro de su liga.
- La combinación proveedor-externalId es única para toda la colección de jugadores.
- Un jugador activo se relaciona con un único equipo y una única liga actuales.
- El equipo relacionado con un jugador debe pertenecer a la liga relacionada con ese
  jugador.
- Una actualización proveniente de la misma combinación proveedor-externalId debe
  actualizar el jugador existente, no crear otro registro.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los jugadores activos válidos de las cinco ligas aparece en
  GET /players cuando se consulta sin filtros.
- **SC-002**: El 100 % de los filtros válidos devuelve únicamente jugadores que
  cumplen la condición solicitada, y los filtros combinados no devuelven falsos positivos.
- **SC-003**: El 100 % de los identificadores válidos existentes devuelve el detalle
  correcto y el 100 % de los identificadores inexistentes devuelve 404.
- **SC-004**: El 100 % de los intentos de duplicar una identidad proveedor-externalId
  se rechaza sin crear un segundo jugador.
- **SC-005**: El catálogo continúa respondiendo correctamente en el 100 % de las
  consultas de lectura cuando el proveedor externo no está disponible.
- **SC-006**: El 100 % de los casos de filtros inválidos, datos incompletos y relaciones
  inconsistentes se rechaza sin persistir datos parciales.
- **SC-007**: Un integrante del equipo puede verificar el listado y el detalle utilizando
  la documentación y la colección compartida sin instrucciones fuera del repositorio.

## Assumptions

- La primera entrega es de solo lectura: no se crean, editan ni eliminan jugadores
  mediante endpoints públicos.
- Los datos iniciales se cargan mediante seed o fixture controlado y deben cumplir las
  mismas invariantes que los datos importados posteriormente.
- La integración real con WhoScored se implementará en otra feature y no forma parte
  de esta especificación. La primera entrega completa, según las pautas del equipo
  docente, requerirá además implementar esa feature posterior de scraping; esta
  especificación cubre únicamente el modelo, la persistencia y el catálogo.
- La feature de scraping dependerá de este contrato y deberá entregar registros
  canónicos mediante un Adapter, sin hacer que los endpoints de lectura consulten
  directamente al proveedor externo.
- Las estadísticas detalladas no forman parte del contrato observable de esta entrega;
  podrán agregarse en una feature posterior sin cambiar la identidad del jugador.
- No se incorpora paginación en esta entrega porque no está requerida; el contrato
  conserva total para facilitar una ampliación futura.
- Las consultas del catálogo no dependen de la identidad de un usuario y se consideran
  públicas; se reutiliza la autenticación JWT existente para las funcionalidades que
  sí requieran identidad.
- Un jugador tiene una única liga y equipo actuales en este alcance; el historial de
  transferencias queda fuera de la feature.
- El plan debe concretar el uso de TypeScript, NestJS, PostgreSQL, DTOs, repositories,
  tests de integración y Testcontainers conforme a la constitución, sin trasladar esas
  dependencias al modelo de dominio.
