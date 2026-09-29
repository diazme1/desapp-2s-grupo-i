---

description: "Task list for Catálogo visual de jugadores"

---

# Tasks: Catálogo visual de jugadores

**Input**: Design documents from `specs/007-catalogo-visual-jugadores/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/frontend-player-catalog.md](./contracts/frontend-player-catalog.md), [quickstart.md](./quickstart.md)

**Tests**: No se generan tareas de tests automatizados de frontend porque la especificación los dejó fuera de esta iteración. No modificar ni eliminar tests existentes.

**Organization**: Las tareas están agrupadas por historia de usuario y ordenadas por dependencia.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar los puntos de integración existentes sin incorporar dependencias nuevas.

- [X] T001 Revisar `frontend/src/App.tsx`, `frontend/src/auth/auth-context.tsx` y `frontend/src/shared/http-client.ts` y documentar en el cambio de la feature los puntos de integración de rutas, sesión y errores 401.
- [X] T002 [P] Crear la carpeta de feature `frontend/src/players/` y reservar el alcance de estilos en `frontend/src/players/players.css`, sin agregar dependencias nuevas a `frontend/package.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Crear los modelos y servicios compartidos que necesitan todas las historias.

**⚠️ CRITICAL**: Ninguna historia de usuario puede comenzar hasta completar esta fase.

- [X] T003 [P] Definir los tipos de jugador, equipo, liga, disponibilidad de estadísticas, detalle estadístico, filtros y estados de consulta en `frontend/src/players/player-types.ts`, incluyendo campos opcionales para `fotoUrl`, `estadisticasDisponibles` y `estadisticas`.
- [X] T004 [P] Implementar las funciones REST `listarJugadores` y `obtenerJugador` en `frontend/src/players/players-api.ts`, reutilizando `request` y `withBearer` de `frontend/src/shared/http-client.ts` y preservando el manejo global de respuestas 401.
- [X] T005 [P] Implementar las funciones puras de normalización, derivación de opciones y filtrado combinado en `frontend/src/players/player-filters.ts`, contemplando búsqueda sin distinguir mayúsculas, filtros por liga/equipo/disponibilidad y valores opcionales.
- [X] T006 Documentar en `frontend/src/players/player-types.ts` y `frontend/src/players/players-api.ts` la compatibilidad hacia atrás: si el backend no entrega foto, disponibilidad o bloque de estadísticas, la UI debe recibir un estado ausente y no inventar datos.

**Checkpoint**: Los tipos, el cliente REST y las funciones de filtrado están disponibles para las historias de usuario.

---

## Phase 3: User Story 1 - Consultar el catálogo visual (Priority: P1) 🎯 MVP

**Goal**: Mostrar el catálogo local en una pantalla protegida con cards, datos opcionales y estados básicos.

**Independent Test**: Con un catálogo persistido, iniciar sesión, abrir `/app` y comprobar que aparece el título, una card por jugador, placeholder para fotos ausentes y estados de carga/vacío/error comprensibles.

### Implementation for User Story 1

- [X] T007 [P] [US1] Implementar la card visual y semántica de un jugador en `frontend/src/players/PlayerCard.tsx`, mostrando nombre, equipo, liga, posición, foto o placeholder y estado de estadísticas.
- [X] T008 [US1] Implementar la carga del catálogo y los estados `cargando`, `cargado`, `catalogo_vacio` y `error` en `frontend/src/players/PlayersPage.tsx`, usando `listarJugadores` y permitiendo reintentar.
- [X] T009 [US1] Integrar la pantalla del catálogo en la ruta protegida `/app` desde `frontend/src/App.tsx`, conservando el usuario visible y la acción de cerrar sesión existente.
- [X] T010 [US1] Aplicar el layout web de escritorio, la grilla, el placeholder de foto, los mensajes de estado y los estilos de foco en `frontend/src/players/players.css`.

**Checkpoint**: User Story 1 funciona de forma independiente como MVP; el usuario autenticado puede consultar el catálogo sin filtros ni detalle.

---

## Phase 4: User Story 2 - Filtrar jugadores (Priority: P1)

**Goal**: Permitir localizar jugadores por nombre, liga, equipo y disponibilidad, combinando y limpiando filtros.

**Independent Test**: Con jugadores de varias ligas y equipos, aplicar cada filtro por separado y combinado, comprobar el estado sin resultados y limpiar los filtros para recuperar el catálogo completo.

### Implementation for User Story 2

- [X] T011 [P] [US2] Implementar los controles de búsqueda, selección de liga, selección de equipo, disponibilidad y limpieza en `frontend/src/players/PlayerFilters.tsx`, con labels accesibles y valores derivados del catálogo cargado.
- [X] T012 [US2] Conectar el estado de filtros con el resultado derivado de `PlayersPage` en `frontend/src/players/PlayersPage.tsx`, aplicando `player-filters.ts` sin volver a consultar el backend por cada interacción.
- [X] T013 [US2] Implementar en `frontend/src/players/PlayersPage.tsx` el estado de resultado sin coincidencias y la acción para limpiar filtros, y completar sus estilos en `frontend/src/players/players.css`.

**Checkpoint**: User Stories 1 y 2 funcionan juntas; el catálogo conserva todos los jugadores y muestra solo los que cumplen los filtros activos.

---

## Phase 5: User Story 3 - Consultar estadísticas disponibles (Priority: P2)

**Goal**: Permitir consultar el detalle de un jugador con estadísticas disponibles y representar datos completos o parciales.

**Independent Test**: Seleccionar una card marcada como disponible, navegar al detalle, comprobar la carga, visualizar métricas disponibles y diferenciar valores `0` de campos ausentes.

### Implementation for User Story 3

- [X] T014 [P] [US3] Implementar la pantalla de detalle y sus estados de consulta en `frontend/src/players/PlayerStatsPage.tsx`, obteniendo el jugador mediante `obtenerJugador`.
- [X] T015 [P] [US3] Implementar la presentación de métricas completas y parciales en `frontend/src/players/PlayerStatsPanel.tsx`, mostrando valores numéricos —incluido `0`— y “No disponible” para `null` o campos ausentes.
- [X] T016 [US3] Agregar la ruta protegida `/app/players/:id/estadisticas` en `frontend/src/App.tsx` y conectar la navegación desde las cards hacia una ficha segura en `frontend/src/players/PlayerCard.tsx`.
- [X] T017 [US3] Integrar el estado de estadísticas completas/parciales/ausentes con los tipos definidos en `frontend/src/players/player-types.ts` y los estilos de detalle en `frontend/src/players/players.css`.

**Checkpoint**: Las cards con estadísticas disponibles permiten consultar un detalle válido sin afectar la navegación del catálogo.

---

## Phase 6: User Story 4 - Manejar ausencia o error de estadísticas (Priority: P2)

**Goal**: Mantener una experiencia clara cuando el endpoint está incompleto, devuelve ausencia, 404, errores o indisponibilidad temporal.

**Independent Test**: Simular o utilizar respuestas sin `estadisticas`, 404, error de red y error 5xx; comprobar que el usuario ve un estado recuperable, puede volver al catálogo y no pierde las cards restantes.

### Implementation for User Story 4

- [X] T018 [US4] Manejar en `frontend/src/players/PlayerStatsPage.tsx` las respuestas sin estadísticas, vacías, 404 y errores temporales mostrando “Estadísticas no disponibles” o un mensaje equivalente y una acción de regreso.
- [X] T019 [US4] Asegurar en `frontend/src/players/PlayerCard.tsx` y `frontend/src/players/PlayersPage.tsx` que un jugador sin disponibilidad conocida permanece visible, puede abrir una ficha segura sin navegación inválida y participa del filtro correspondiente.
- [X] T020 [US4] Manejar errores de carga del catálogo y reintentos sin perder la sesión en `frontend/src/players/PlayersPage.tsx`, reutilizando `ApiError` de `frontend/src/shared/http-client.ts`.
- [X] T021 [US4] Completar mensajes, estados de foco, retorno al catálogo y comportamiento de teclado para errores y ausencia de datos en `frontend/src/players/PlayerStatsPage.tsx` y `frontend/src/players/players.css`.

**Checkpoint**: La indisponibilidad del endpoint de estadísticas no rompe el catálogo ni deja al usuario en una pantalla vacía.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validar la integración completa y dejar la documentación operativa alineada.

- [X] T022 [P] Actualizar las rutas y el flujo de catálogo en `frontend/README.md`, incluyendo `/app`, `/app/players/:id/estadisticas` y la dependencia temporal del endpoint de estadísticas.
- [X] T023 [P] Revisar consistencia visual, foco visible, labels, contraste, estados y alcance exclusivamente web en `frontend/src/players/players.css`, `frontend/src/players/PlayerFilters.tsx` y `frontend/src/players/PlayerCard.tsx`.
- [ ] T024 Ejecutar la validación manual de `specs/007-catalogo-visual-jugadores/quickstart.md`, luego ejecutar `npm run lint` y `npm run build` desde `frontend`; documentar cualquier bloqueo sin agregar tests automatizados en esta iteración.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No depende de otras fases.
- **Foundational (Phase 2)**: Depende de Setup y bloquea todas las historias.
- **User Story 1 (Phase 3)**: Depende de Foundation y constituye el MVP.
- **User Story 2 (Phase 4)**: Depende de US1 porque conecta sus controles con la pantalla del catálogo.
- **User Story 3 (Phase 5)**: Depende de US1 para la card y de Foundation para el contrato API; no depende de US2.
- **User Story 4 (Phase 6)**: Depende de US1 y US3 porque refina los estados del catálogo y del detalle.
- **Polish (Phase 7)**: Depende de las historias que se quieran entregar.

### User Story Dependencies

```text
Foundation
   |
   v
US1 (catálogo MVP) -----> US2 (filtros)
   |
   v
US3 (detalle de estadísticas) -----> US4 (ausencia y errores)
```

US2 y US3 pueden desarrollarse en paralelo después de US1 si se coordinan los cambios sobre `PlayersPage.tsx` y `PlayerCard.tsx`. US4 debe integrarse después de que exista el detalle.

### Parallel Opportunities

- T003, T004 y T005 pueden ejecutarse en paralelo porque modifican archivos distintos.
- T007 puede ejecutarse en paralelo con T008 si se acuerda previamente la interfaz de `PlayerCard`.
- T011 puede ejecutarse en paralelo con T014 y T015 después de completar US1, porque trabaja en archivos distintos.
- T022 y T023 pueden ejecutarse en paralelo antes de T024.

## Parallel Example: User Story 1

```text
T007: Implementar PlayerCard.tsx con la interfaz acordada.
T008: Implementar PlayersPage.tsx con carga y estados básicos.
```

T009 integra ambas piezas en `App.tsx` y debe ejecutarse después de que los componentes estén disponibles. T010 puede comenzar cuando se conozcan las clases y estados visuales de la página.

## Parallel Example: User Story 3

```text
T014: Implementar PlayerStatsPage.tsx y su ciclo de consulta.
T015: Implementar PlayerStatsPanel.tsx para métricas completas y parciales.
```

T016 conecta la ruta y la navegación después de que existan la página y el panel.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup y Foundation.
2. Implementar US1: catálogo protegido con cards y estados básicos.
3. Ejecutar el checkpoint manual de US1.
4. Mostrar o revisar el MVP antes de avanzar con filtros y estadísticas.

### Incremental Delivery

1. Agregar US2 para filtros y búsqueda.
2. Agregar US3 para el detalle cuando el backend entregue estadísticas.
3. Agregar US4 para cubrir endpoint pendiente, respuestas vacías, errores y retorno.
4. Ejecutar Polish y el quickstart completo.

### Notes

- Cada tarea sigue el formato requerido: checkbox, identificador secuencial, marcador `[P]` solo cuando es paralelizable, etiqueta de historia cuando corresponde y rutas concretas.
- No se generaron tareas de tests automatizados por la instrucción explícita de la spec.
- La implementación no debe modificar ni eliminar los tests existentes.
