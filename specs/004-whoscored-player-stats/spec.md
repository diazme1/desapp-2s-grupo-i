# Feature Specification: Obtención y persistencia de estadísticas de jugadores desde WhoScored

**Feature Branch**: `004-whoscored-player-stats`

**Created**: 2026-09-23

**Status**: Draft

**Input**: Especificar exclusivamente el flujo de obtención, normalización y persistencia de estadísticas de un jugador existente a partir de WhoScored.

## Contexto y alcance

Esta feature permite obtener estadísticas detalladas de un `Jugador` que ya existe en el sistema. La operación recibe `idJugador`, `nombreJugador`, `equipoJugador` y `ligaEquipoJugador`, utiliza los tres últimos datos para identificar al jugador en WhoScored, normaliza la información recuperada y persiste una observación de `EstadisticasJugador` asociada al `idJugador` local.

El catálogo local de jugadores, equipos y ligas es un pre-requisito y no se crea, actualiza ni rediseña en esta feature. WhoScored es la única fuente externa contemplada. La integración debe estar encapsulada detrás de un `WhoScoredAdapter` para que el dominio y la persistencia no dependan del mecanismo concreto de consulta o scraping.

## Clarifications

### Session 2026-09-23

- Q: ¿La operación principal debe ser un caso de uso o servicio interno, sin crear un endpoint HTTP? → A: Sí. Recibe `idJugador`, `nombreJugador`, `equipoJugador` y `ligaEquipoJugador`, y devuelve un resultado interno que distingue éxito completo, éxito parcial, jugador local inexistente, jugador no encontrado en WhoScored, matching ambiguo, fuente no disponible, estructura inesperada, ausencia total de estadísticas y error de persistencia.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Obtener y guardar estadísticas de un jugador identificado (Priority: P1)

Como integrante del sistema que necesita datos de rendimiento, quiero solicitar las estadísticas de un jugador local existente usando su identidad, equipo y liga para disponer de una observación persistida y asociada al jugador correcto.

**Why this priority**: Es el flujo principal de la feature y entrega el valor de incorporar estadísticas externas al modelo local.

**Independent Test**: Preparar un jugador local existente y un caso de WhoScored con una única coincidencia consistente; ejecutar la operación y comprobar que devuelve éxito, conserva los siete datos requeridos y crea una observación asociada al `idJugador` recibido.

**Acceptance Scenarios**:

1. **Given** un `Jugador` existente y una coincidencia única en WhoScored que corresponde a su nombre, equipo y liga, **When** se solicita la obtención de estadísticas con los cuatro parámetros requeridos, **Then** se recuperan y normalizan goles, asistencias, tiros, pases clave, regates, entradas y rating de WhoScored.
2. **Given** que la normalización finalizó correctamente, **When** se persiste el resultado, **Then** se crea una observación de `EstadisticasJugador` relacionada con el `idJugador` recibido y el resultado informa que la obtención y persistencia fueron exitosas.
3. **Given** que una estadística válida del jugador es cero, **When** se normaliza y persiste, **Then** se conserva como `0` y no se informa como faltante.

---

### User Story 2 - Evitar asociaciones incorrectas durante la identificación (Priority: P1)

Como responsable de la confiabilidad de los datos, quiero que la identificación considere conjuntamente nombre, equipo y liga para evitar guardar estadísticas de otro jugador con un nombre similar.

**Why this priority**: Una asociación incorrecta contamina los datos locales y es más grave que no obtener una estadística.

**Independent Test**: Ejecutar casos con ningún candidato, varios candidatos o discrepancias de equipo/liga; comprobar que la operación informa el motivo, no crea estadísticas y no modifica al jugador local.

**Acceptance Scenarios**:

1. **Given** que no existe un candidato de WhoScored compatible con nombre, equipo y liga, **When** se solicita la obtención, **Then** el resultado indica que el jugador no fue encontrado y no se persiste ninguna estadística.
2. **Given** que existen varios candidatos que no pueden distinguirse consistentemente con la información recibida, **When** se intenta realizar el matching, **Then** el resultado indica matching ambiguo y no se persisten estadísticas de ninguno de los candidatos.
3. **Given** un candidato cuyo nombre coincide pero cuyo equipo o liga no coincide de forma consistente, **When** se evalúa la identidad, **Then** el candidato no se considera una coincidencia válida.
4. **Given** un resultado de WhoScored asociado a otro jugador, **When** termina el matching, **Then** no se lo asocia al `idJugador` local aunque sus estadísticas estén disponibles.

---

### User Story 3 - Informar fallas y conservar la integridad local (Priority: P1)

Como consumidor de la operación, quiero conocer si no fue posible recuperar o persistir las estadísticas para poder distinguir un dato ausente de un dato válido y conservar intacta la información local del jugador.

**Why this priority**: La fuente externa puede fallar o entregar datos incompletos; esos casos no deben producir datos inventados ni alterar el catálogo existente.

**Independent Test**: Simular indisponibilidad de WhoScored, estructura inesperada, campos faltantes y error de persistencia; comprobar que cada caso devuelve un resultado clasificado, no modifica al `Jugador` y no deja una observación parcial de persistencia.

**Acceptance Scenarios**:

1. **Given** que WhoScored no está disponible, **When** se solicita la obtención, **Then** el resultado indica que la fuente no está disponible y la información del jugador permanece sin cambios.
2. **Given** que WhoScored devuelve una estructura que no permite interpretar los datos requeridos, **When** se normaliza la respuesta, **Then** el resultado indica estructura externa inesperada y no se inventan ni persisten valores.
3. **Given** que el jugador fue identificado pero algunas estadísticas individuales no están disponibles, **When** el resto de los datos sí puede normalizarse, **Then** los datos disponibles pueden persistirse, cada estadística faltante conserva un estado explícito de no disponible y el resultado indica obtención parcial.
4. **Given** que falla la persistencia de la observación, **When** finaliza la operación, **Then** el resultado indica error de persistencia, no se considera exitosa la operación y el jugador local no se modifica.

### Edge Cases

- El `idJugador` no corresponde a un jugador local existente: la operación informa que el jugador local no existe y no consulta ni persiste estadísticas.
- El nombre, equipo o liga recibido está vacío o no permite identificar razonablemente al jugador: la operación rechaza la solicitud antes de guardar información.
- El nombre coincide con varios jugadores, pero solo uno coincide con equipo y liga: ese único candidato puede considerarse identificado; los demás no deben influir en el resultado.
- No hay candidatos después de aplicar nombre, equipo y liga, aun cuando exista un jugador con un nombre parecido: no se persiste información.
- WhoScored informa un valor numérico cero: se guarda `0`; el cero nunca se usa como señal de ausencia.
- WhoScored omite un campo, devuelve un valor vacío o entrega un valor no interpretable: el campo queda como no disponible, no como cero ni como un valor inferido.
- Faltan todas las estadísticas requeridas después de identificar al jugador: no se crea una observación vacía; el resultado indica que no hay estadísticas recuperables.
- Una consulta o respuesta de WhoScored se interrumpe, expira o no puede leerse: no se modifica al jugador ni se guarda una coincidencia no verificada.
- Se repite una obtención exitosa para el mismo jugador: cada resultado exitoso representa una nueva observación de estadísticas y no sobrescribe observaciones anteriores.
- Ocurre un error después de iniciar la persistencia: no debe quedar una observación incompleta o desligada de un `Jugador` válido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST proveer un caso de uso o servicio interno, no un endpoint HTTP, para obtener estadísticas y recibir `idJugador`, `nombreJugador`, `equipoJugador` y `ligaEquipoJugador`; debe devolver un resultado interno que distinga éxito completo, éxito parcial, jugador local inexistente, jugador no encontrado en WhoScored, matching ambiguo, fuente no disponible, estructura inesperada, ausencia total de estadísticas y error de persistencia.
- **FR-002**: La operación MUST verificar que `idJugador` corresponde a un `Jugador` existente antes de asociar o persistir estadísticas.
- **FR-003**: WhoScored MUST ser la única fuente externa utilizada por esta feature para obtener estadísticas.
- **FR-004**: La integración MUST estar encapsulada en un `WhoScoredAdapter` que reciba `nombreJugador`, `equipoJugador` y `ligaEquipoJugador`, y devuelva un resultado normalizado o un estado explícito de no obtención.
- **FR-005**: La lógica de dominio y persistencia MUST NOT depender directamente de HTTP, HTML, selectores, automatización del navegador ni otros mecanismos concretos de WhoScored.
- **FR-006**: La identificación MUST utilizar conjuntamente nombre, equipo y liga para reducir ambigüedades; el nombre por sí solo MUST NOT ser suficiente para declarar una coincidencia cuando existan alternativas o discrepancias.
- **FR-007**: El sistema MUST persistir estadísticas únicamente cuando la identidad encontrada en WhoScored pueda asociarse de forma consistente con los datos recibidos.
- **FR-008**: La operación MUST recuperar, cuando estén disponibles, goles, asistencias, tiros, pases clave, regates, entradas y rating de WhoScored, dejando claro qué representa cada campo en el modelo interno.
- **FR-009**: Los valores externos MUST convertirse a un modelo interno de `EstadisticasJugador` antes de persistirse.
- **FR-010**: Cada campo estadístico MUST distinguir un valor válido igual a `0` de un estado explícito de estadística no disponible; la ausencia MUST NOT convertirse en cero.
- **FR-011**: Si el jugador fue identificado pero faltan algunas estadísticas individuales, el sistema MUST conservar los datos disponibles y representar explícitamente como no disponibles los campos faltantes, sin inventar ni inferir valores.
- **FR-012**: Si no se puede identificar al jugador, el matching es ambiguo, la fuente no está disponible o la estructura no es interpretable, el sistema MUST NOT persistir estadísticas correspondientes a otro jugador.
- **FR-013**: Si ninguna estadística requerida puede recuperarse después de una identificación válida, el sistema MUST NOT crear una observación vacía y MUST informar que no hay datos recuperables.
- **FR-014**: Debe existir una entidad o registro independiente `EstadisticasJugador` con identificador propio, `idJugador`, goles, asistencias, tiros, pases clave, regates, entradas y rating de WhoScored.
- **FR-015**: La relación MUST ser `Jugador 1 ---- N EstadisticasJugador` y MUST asociar cada observación mediante `idJugador`.
- **FR-016**: Toda observación persistida MUST referenciar un `Jugador` existente; no debe existir una estadística persistida sin asociación válida.
- **FR-017**: `EstadisticasJugador` MUST NOT duplicar nombre, equipo, liga u otros datos básicos que ya pertenezcan a `Jugador`, salvo una necesidad explícita que se justifique en la planificación.
- **FR-018**: Cada obtención exitosa MUST crear una nueva observación de estadísticas y MUST NOT sobrescribir observaciones anteriores del mismo jugador.
- **FR-019**: El resultado de la operación MUST indicar al menos si la persistencia fue exitosa, parcial o no realizada, y distinguir jugador no encontrado, matching ambiguo, fuente no disponible, estructura inesperada, ausencia de datos y error de persistencia.
- **FR-020**: Un error de consulta, matching, normalización o persistencia MUST NOT modificar ni eliminar la información existente del `Jugador`.
- **FR-021**: Un error de persistencia MUST dejar la operación sin una observación parcial o huérfana y MUST informar el error al consumidor.
- **FR-022**: La operación MUST conservar la separación de responsabilidades del proyecto: el caso de uso coordina la obtención y persistencia, el adaptador encapsula WhoScored, el dominio protege las invariantes y el repositorio abstrae la persistencia.
- **FR-023**: Esta feature MUST NOT crear, actualizar ni eliminar jugadores, equipos o ligas, ni implementar endpoints, rankings, comparaciones, recomendaciones o catálogos.
- **FR-024**: La ausencia o falla de WhoScored MUST afectar únicamente el resultado de la obtención y MUST NOT impedir la conservación o lectura de la información local del jugador.

### Key Entities

- **Jugador**: entidad existente del dominio. Su `idJugador` es estable y se utiliza como referencia local; sus datos básicos no se duplican en la observación de estadísticas.
- **EstadisticasJugador**: observación interna de estadísticas obtenida desde WhoScored. Tiene identificador propio, referencia obligatoria a `idJugador` y los campos `goles`, `asistencias`, `tiros`, `pasesClave`, `regates`, `entradas` y `ratingWhoScored`. Cada dato puede contener un valor válido, incluido `0`, o un estado explícito de no disponible.
- **Resultado de obtención de estadísticas**: resultado de la operación que informa éxito total, éxito parcial o el motivo por el cual no se recuperaron o persistieron estadísticas. En caso exitoso identifica la observación persistida; en caso fallido no modifica al jugador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de los casos de aceptación con un jugador local existente y una coincidencia única y consistente en WhoScored, la operación recupera y normaliza los siete datos requeridos.
- **SC-002**: En el 100% de las operaciones exitosas, la observación persistida queda asociada al `idJugador` recibido y puede distinguirse de observaciones de cualquier otro jugador.
- **SC-003**: En el 100% de los casos de identificación no encontrada o ambigua, no se crea una observación de estadísticas y el registro del jugador local permanece sin cambios.
- **SC-004**: En el 100% de los casos de prueba con una estadística válida igual a cero, el resultado persistido conserva `0`; en el 100% de los casos de ausencia, el resultado conserva el estado no disponible sin convertirlo en cero.
- **SC-005**: En una prueba de aceptación con al menos 20 jugadores correctamente identificados y con estadísticas disponibles, el 100% de las observaciones contiene los siete campos requeridos correctamente asociados a su jugador.
- **SC-006**: El 100% de las fallas de fuente, estructura externa, ausencia total de estadísticas y persistencia se informa mediante un resultado distinguible y no altera ni elimina datos del jugador.
- **SC-007**: El 100% de las operaciones termina con un estado observable —éxito total, éxito parcial o causa de no obtención— y ninguna queda pendiente indefinidamente.
- **SC-008**: Una revisión de la solución puede verificar que el dominio y la persistencia no conocen el mecanismo concreto de consulta o scraping de WhoScored y que el resultado externo se convierte al modelo interno antes de guardarse.
- **SC-009**: La ejecución de esta feature no produce cambios en el catálogo de jugadores, equipos o ligas ni agrega funcionalidades fuera del flujo especificado.

## Assumptions

- Los jugadores, equipos y ligas utilizados como contexto ya existen localmente; la creación o actualización de ese catálogo pertenece a otras features.
- El consumidor dispone de los cuatro valores de entrada y los entrega con el formato necesario para intentar la identificación; las validaciones de forma del transporte se definirán en la planificación correspondiente.
- Una coincidencia es suficientemente consistente cuando un único candidato satisface conjuntamente nombre, equipo y liga según las reglas que se concreten al investigar WhoScored durante la planificación.
- Si se identifica al jugador y solo faltan algunas estadísticas, se permite persistir una observación parcial con esos campos explícitamente no disponibles; si no hay ninguna estadística recuperable, no se persiste una observación vacía.
- Cada ejecución exitosa representa una observación independiente. La forma de ordenar o consultar observaciones históricas queda fuera de esta feature.
- El significado exacto de los campos de WhoScored, su disponibilidad por competición y las reglas de matching que dependan de la estructura actual del sitio se investigarán durante `/speckit.plan`; no se fijan selectores, librerías ni herramientas concretas en esta especificación.
- La operación puede ser invocada por el caso de uso que corresponda en el proyecto; la creación de endpoints públicos no forma parte de esta feature.

## Fuera de alcance

- Obtención o actualización del catálogo de jugadores, equipos o ligas.
- Football-Data.org, scraping de jugadores y cualquier fuente externa distinta de WhoScored.
- `POST /catalog/refresh`, `GET /players`, `GET /players/:id` y cualquier otro endpoint no indispensable para el caso de uso.
- Frontend, rankings, comparaciones, recomendaciones y estadísticas no enumeradas en esta especificación, salvo datos técnicos indispensables para identificar o persistir correctamente.
- Librerías de scraping, selectores HTML, browser automation, detalles de despliegue y decisiones concretas de infraestructura.
