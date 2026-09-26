# Feature Specification: Obtención y persistencia de estadísticas de jugadores desde WhoScored

**Feature Branch**: `004-whoscored-player-stats`

**Created**: 2026-09-23

**Status**: Draft

**Input**: Especificar exclusivamente el flujo de obtención, normalización y persistencia de estadísticas de un jugador existente a partir de WhoScored.

## Contexto y alcance

Esta feature permite obtener estadísticas detalladas de un `Jugador` que ya existe en el sistema. La operación recibe `idJugador`, `nombreJugador`, `equipoJugador` y `ligaEquipoJugador`, utiliza los tres últimos datos para identificar al jugador en WhoScored, normaliza la información recuperada y persiste una observación de `EstadisticasJugador` asociada al `idJugador` local. Como integración final, esta operación se ejecuta como segunda etapa del flujo iniciado por el endpoint existente `POST /catalog/refresh`, después de que la etapa de catálogo haya persistido o actualizado los jugadores.

La primera etapa existente de actualización del catálogo conserva su responsabilidad de obtener y persistir ligas, equipos y jugadores; esta feature no la reemplaza ni la rediseña. WhoScored es la única fuente externa contemplada para estadísticas. La integración debe estar encapsulada detrás de un `WhoScoredAdapter` para que el dominio y la persistencia no dependan del mecanismo concreto de consulta o scraping.

## Clarifications

### Session 2026-09-23

- Q: ¿La operación principal debe ser un caso de uso o servicio interno, sin crear un endpoint HTTP? → A: Sí. Recibe `idJugador`, `nombreJugador`, `equipoJugador` y `ligaEquipoJugador`, y devuelve un resultado interno que distingue éxito completo, éxito parcial, jugador local inexistente, jugador no encontrado en WhoScored, matching ambiguo, fuente no disponible, estructura inesperada, ausencia total de estadísticas y error de persistencia.

### Session 2026-09-24

- Q: Cuando `POST /catalog/refresh` completa correctamente el catálogo pero las estadísticas fallan para algunos o todos los jugadores, ¿qué resultado global debe devolver el refresh? → A: Debe devolver HTTP 200 con el resumen del catálogo y un resultado independiente para la etapa de estadísticas, distinguiendo estadísticas completas, parciales o inexistentes; el fallo de WhoScored no convierte en fallida la actualización válida del catálogo.
- Q: ¿Debe la respuesta de `POST /catalog/refresh` incluir un detalle individual para cada jugador procesado en la etapa de estadísticas? → A: No. Debe informar únicamente el estado global de la etapa de estadísticas y sus contadores agregados.
- Q: Cuando falla la primera etapa del catálogo, ¿qué contrato debe conservar `POST /catalog/refresh`? → A: Debe mantener el contrato de error HTTP existente, omitir la etapa de estadísticas y conservar las reglas actuales de persistencia o rollback del catálogo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Obtener y guardar estadísticas de un jugador identificado (Priority: P1)

Como integrante del sistema que necesita datos de rendimiento, quiero solicitar las estadísticas de un jugador local existente usando su identidad, equipo y liga para disponer de una observación persistida y asociada al jugador correcto.

**Why this priority**: Es el flujo principal de la feature y entrega el valor de incorporar estadísticas externas al modelo local.

**Independent Test**: Preparar un jugador local existente y un caso de WhoScored con una única coincidencia consistente; ejecutar la operación y comprobar que devuelve éxito, conserva los siete datos requeridos y crea una observación asociada al `idJugador` recibido.

**Acceptance Scenarios**:

1. **Given** un `Jugador` existente y una coincidencia única en WhoScored que corresponde a su nombre, equipo y liga, **When** se solicita la obtención de estadísticas con los cuatro parámetros requeridos, **Then** se recuperan y normalizan goles, asistencias, `SpG`, `KeyP`, `Drb`, `Fouls` y rating de WhoScored.
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

---

### User Story 4 - Completar el refresh del catálogo con estadísticas (Priority: P1)

Como consumidor del refresh existente, quiero que después de actualizar y persistir el catálogo se obtengan las estadísticas de los jugadores resultantes, para disponer de un proceso completo sin duplicar la carga del catálogo.

**Why this priority**: Es la integración funcional que conecta la obtención de estadísticas con el único flujo de actualización utilizado por el sistema.

**Independent Test**: Ejecutar `POST /catalog/refresh` con una primera etapa que devuelva múltiples jugadores persistidos y dobles controlados de WhoScored; comprobar que cada jugador recibe su intento independiente de estadísticas, que el resultado global distingue éxito completo, parcial o sin estadísticas y que la primera etapa no se revierte.

**Acceptance Scenarios**:

1. **Given** que la primera etapa obtiene y persiste correctamente ligas, equipos y jugadores, **When** finaliza esa etapa del refresh, **Then** el mismo proceso utiliza los jugadores resultantes y sus datos `idJugador`, nombre, equipo y liga para iniciar la etapa de estadísticas.
2. **Given** que todos los jugadores resultantes obtienen estadísticas persistibles, **When** finaliza el refresh, **Then** la respuesta HTTP es exitosa, conserva el resumen del catálogo e informa que la etapa de estadísticas fue completa.
3. **Given** que algunos jugadores obtienen estadísticas y otros fallan por un motivo clasificado, **When** finaliza el refresh, **Then** la respuesta HTTP es exitosa, conserva el resumen del catálogo e informa un resultado parcial con contadores agregados de jugadores exitosos y fallidos.
4. **Given** que ningún jugador obtiene estadísticas pero la primera etapa del catálogo finalizó correctamente, **When** finaliza el refresh, **Then** la respuesta HTTP es exitosa, conserva el catálogo e informa que no hubo estadísticas recuperables.
5. **Given** que falla la primera etapa de obtención o persistencia del catálogo, **When** se ejecuta el refresh, **Then** la etapa de estadísticas no comienza y se conserva el comportamiento de error existente del refresh.
6. **Given** que falla WhoScored para un jugador, **When** se procesa la segunda etapa, **Then** no se elimina ni revierte ese jugador, no se modifican ligas o equipos y se continúa procesando a los demás jugadores resultantes.

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
- El refresh produce múltiples jugadores: cada jugador se procesa de forma independiente y un fallo de estadísticas no impide conservar ni procesar los demás.
- Todos los jugadores del refresh fallan en la etapa de estadísticas: se conserva el catálogo actualizado y el resultado global informa ausencia total de estadísticas.
- La primera etapa del refresh falla antes de persistir correctamente los jugadores: no se inicia la etapa de estadísticas.
- El endpoint existente `POST /catalog/refresh` permanece como único punto de entrada HTTP; no se crea otro endpoint ni se coloca scraping en el controller.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST proveer un caso de uso o servicio interno para obtener estadísticas y recibir `idJugador`, `nombreJugador`, `equipoJugador` y `ligaEquipoJugador`; debe devolver un resultado interno que distinga éxito completo, éxito parcial, jugador local inexistente, jugador no encontrado en WhoScored, matching ambiguo, fuente no disponible, estructura inesperada, ausencia total de estadísticas y error de persistencia. Este caso de uso MUST ser invocado por la etapa de estadísticas del refresh, no exponerse como un endpoint nuevo.
- **FR-002**: La operación MUST verificar que `idJugador` corresponde a un `Jugador` existente antes de asociar o persistir estadísticas.
- **FR-003**: WhoScored MUST ser la única fuente externa utilizada por esta feature para obtener estadísticas.
- **FR-004**: La integración MUST estar encapsulada en un `WhoScoredAdapter` que reciba `nombreJugador`, `equipoJugador` y `ligaEquipoJugador`, y devuelva un resultado normalizado o un estado explícito de no obtención.
- **FR-005**: La lógica de dominio y persistencia MUST NOT depender directamente de HTTP, HTML, selectores, automatización del navegador ni otros mecanismos concretos de WhoScored.
- **FR-006**: La identificación MUST utilizar conjuntamente nombre, equipo y liga para reducir ambigüedades; el nombre por sí solo MUST NOT ser suficiente para declarar una coincidencia cuando existan alternativas o discrepancias.
- **FR-007**: El sistema MUST persistir estadísticas únicamente cuando la identidad encontrada en WhoScored pueda asociarse de forma consistente con los datos recibidos.
- **FR-008**: La operación MUST recuperar, cuando estén disponibles, goles, asistencias, tiros por partido (`SpG`), pases clave por partido (`KeyP`), regates por partido (`Drb`), faltas cometidas por partido (`Fouls`) y rating de WhoScored, dejando claro qué representa cada campo en el modelo interno.
- **FR-009**: Los valores externos MUST convertirse a un modelo interno de `EstadisticasJugador` antes de persistirse.
- **FR-010**: Cada campo estadístico MUST distinguir un valor válido igual a `0` de un estado explícito de estadística no disponible; la ausencia MUST NOT convertirse en cero.
- **FR-011**: Si el jugador fue identificado pero faltan algunas estadísticas individuales, el sistema MUST conservar los datos disponibles y representar explícitamente como no disponibles los campos faltantes, sin inventar ni inferir valores.
- **FR-012**: Si no se puede identificar al jugador, el matching es ambiguo, la fuente no está disponible o la estructura no es interpretable, el sistema MUST NOT persistir estadísticas correspondientes a otro jugador.
- **FR-013**: Si ninguna estadística requerida puede recuperarse después de una identificación válida, el sistema MUST NOT crear una observación vacía y MUST informar que no hay datos recuperables.
- **FR-014**: Debe existir una entidad o registro independiente `EstadisticasJugador` con identificador propio, `idJugador`, goles, asistencias, tiros, pases clave, regates, faltas cometidas y rating de WhoScored.
- **FR-015**: La relación MUST ser `Jugador 1 ---- N EstadisticasJugador` y MUST asociar cada observación mediante `idJugador`.
- **FR-016**: Toda observación persistida MUST referenciar un `Jugador` existente; no debe existir una estadística persistida sin asociación válida.
- **FR-017**: `EstadisticasJugador` MUST NOT duplicar nombre, equipo, liga u otros datos básicos que ya pertenezcan a `Jugador`, salvo una necesidad explícita que se justifique en la planificación.
- **FR-018**: Cada obtención exitosa MUST crear una nueva observación de estadísticas y MUST NOT sobrescribir observaciones anteriores del mismo jugador.
- **FR-019**: El resultado de la operación MUST indicar al menos si la persistencia fue exitosa, parcial o no realizada, y distinguir jugador no encontrado, matching ambiguo, fuente no disponible, estructura inesperada, ausencia de datos y error de persistencia.
- **FR-020**: Un error de consulta, matching, normalización o persistencia MUST NOT modificar ni eliminar la información existente del `Jugador`.
- **FR-021**: Un error de persistencia MUST dejar la operación sin una observación parcial o huérfana y MUST informar el error al consumidor.
- **FR-022**: La operación MUST conservar la separación de responsabilidades del proyecto: el caso de uso coordina la obtención y persistencia, el adaptador encapsula WhoScored, el dominio protege las invariantes y el repositorio abstrae la persistencia.
- **FR-023**: Esta feature MUST NOT crear endpoints nuevos, ni implementar rankings, comparaciones o recomendaciones, ni duplicar o rediseñar el catálogo. La etapa existente de jugadores, equipos y ligas solo puede extenderse mediante el encadenamiento de estadísticas definido aquí. El único endpoint involucrado es el existente `POST /catalog/refresh`.
- **FR-024**: La ausencia o falla de WhoScored MUST afectar únicamente el resultado de la obtención y MUST NOT impedir la conservación o lectura de la información local del jugador.
- **FR-025**: `POST /catalog/refresh`, ubicado en `backend/src/players/players.controller.ts`, MUST ser el punto de entrada del proceso completo sin reemplazarse ni duplicarse.
- **FR-026**: La etapa de estadísticas MUST comenzar únicamente después de que la etapa existente haya obtenido y persistido o actualizado correctamente ligas, equipos y jugadores.
- **FR-027**: La segunda etapa MUST reutilizar los jugadores resultantes de la primera etapa, incluyendo `idJugador`, nombre, equipo y liga, y MUST NOT volver a consultar Football-Data ni recrear el catálogo para obtener ese contexto.
- **FR-028**: `ActualizarCatalogoService` MUST coordinar ambas etapas; `players.controller.ts` MUST limitarse a recibir la solicitud y delegar el refresh, sin contener scraping, matching, normalización ni persistencia de estadísticas.
- **FR-029**: La obtención de estadísticas MUST procesar cada jugador resultante de forma independiente. Un fallo de estadísticas MUST NOT eliminar ni revertir el jugador, las ligas o los equipos persistidos, y MUST NOT impedir conservar o procesar a los demás jugadores.
- **FR-030**: El resultado global del refresh MUST conservar el resumen de la etapa de catálogo y distinguir, para la segunda etapa, estadísticas completas cuando todos los jugadores fueron exitosos, estadísticas parciales cuando solo algunos fueron exitosos y ausencia total de estadísticas cuando ninguno fue recuperable. Debe informar contadores agregados de jugadores procesados, exitosos y fallidos, sin exigir un detalle individual por jugador.
- **FR-031**: Si la primera etapa del catálogo falla, la segunda etapa MUST NOT comenzar y el refresh MUST conservar el comportamiento de error existente para esa primera etapa.

### Key Entities

- **Jugador**: entidad existente del dominio. Su `idJugador` es estable y se utiliza como referencia local; sus datos básicos no se duplican en la observación de estadísticas.
- **EstadisticasJugador**: observación interna de estadísticas obtenida desde WhoScored. Tiene identificador propio, referencia obligatoria a `idJugador` y los campos `goles`, `asistencias`, `tiros`, `pasesClave`, `regates`, `faltasCometidas` y `ratingWhoScored`. Las cuatro métricas de acción son promedios por partido y cada dato puede contener un valor válido, incluido `0`, o un estado explícito de no disponible.
- **Resultado de obtención de estadísticas**: resultado de la operación que informa éxito total, éxito parcial o el motivo por el cual no se recuperaron o persistieron estadísticas. En caso exitoso identifica la observación persistida; en caso fallido no modifica al jugador.
- **Resultado global del refresh**: resultado del proceso iniciado por `POST /catalog/refresh`, que conserva el resumen de ligas, equipos y jugadores de la primera etapa y agrega un resumen independiente de la etapa de estadísticas, distinguiendo estadísticas completas, parciales o inexistentes.

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
- **SC-009**: La ejecución de esta feature no produce cambios adicionales ni rediseña el catálogo existente de jugadores, equipos o ligas, y no agrega funcionalidades fuera del flujo especificado.
- **SC-010**: En el 100% de los refresh donde la primera etapa persiste correctamente jugadores, la etapa de estadísticas se inicia utilizando únicamente los jugadores resultantes de esa ejecución y sus datos locales.
- **SC-011**: En el 100% de los refresh con catálogo exitoso, la respuesta conserva el resumen de la primera etapa y distingue estadísticas completas, parciales o inexistentes sin convertir un fallo de WhoScored en un fallo de catálogo.
- **SC-012**: En el 100% de los casos donde falla la estadística de un jugador, el jugador, equipo y liga persistidos permanecen sin eliminación ni reversión, y los demás jugadores continúan siendo procesables.
- **SC-013**: En el 100% de los refresh donde falla la primera etapa del catálogo, no se inicia la etapa de estadísticas y se mantiene el comportamiento de error existente.
- **SC-014**: Una revisión de la implementación verifica que `players.controller.ts` no contiene lógica de scraping, matching, normalización o persistencia de estadísticas y que no se agrega ningún endpoint.

## Assumptions

- La primera etapa existente del refresh es responsable de obtener y persistir ligas, equipos y jugadores; esta feature reutiliza sus resultados y no duplica esa lógica.
- El consumidor dispone de los cuatro valores de entrada y los entrega con el formato necesario para intentar la identificación; las validaciones de forma del transporte se definirán en la planificación correspondiente.
- Una coincidencia es suficientemente consistente cuando un único candidato satisface conjuntamente nombre, equipo y liga según las reglas que se concreten al investigar WhoScored durante la planificación.
- Si se identifica al jugador y solo faltan algunas estadísticas, se permite persistir una observación parcial con esos campos explícitamente no disponibles; si no hay ninguna estadística recuperable, no se persiste una observación vacía.
- Cada ejecución exitosa representa una observación independiente. La forma de ordenar o consultar observaciones históricas queda fuera de esta feature.
- El significado exacto de los campos de WhoScored, su disponibilidad por competición y las reglas de matching que dependan de la estructura actual del sitio se investigarán durante `/speckit.plan`; no se fijan selectores, librerías ni herramientas concretas en esta especificación.
- La operación interna de estadísticas se invoca desde `ActualizarCatalogoService` después de la persistencia de jugadores. El único punto de entrada HTTP es el `POST /catalog/refresh` existente.

## Fuera de alcance

- Rediseñar, reemplazar o duplicar la etapa existente de obtención y actualización del catálogo de jugadores, equipos o ligas.
- Football-Data.org, scraping de jugadores y cualquier fuente externa distinta de WhoScored.
- Crear endpoints adicionales o modificar el propósito de `GET /players` y `GET /players/:id`; `POST /catalog/refresh` es el único endpoint existente que se integra en esta feature.
- Frontend, rankings, comparaciones, recomendaciones y estadísticas no enumeradas en esta especificación, salvo datos técnicos indispensables para identificar o persistir correctamente.
- Librerías de scraping, selectores HTML, browser automation, detalles de despliegue y decisiones concretas de infraestructura.
