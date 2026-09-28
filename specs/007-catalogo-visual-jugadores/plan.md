# Implementation Plan: Catálogo visual de jugadores

**Branch**: `feat/front-catalogo` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-catalogo-visual-jugadores/spec.md`

## Summary

Se incorporará una pantalla protegida de catálogo de jugadores dentro del frontend React existente. La pantalla consultará el catálogo local mediante el cliente HTTP compartido, mostrará cards con fallback de imagen, filtrará en la vista por nombre, liga, equipo y disponibilidad de estadísticas, y navegará a un detalle de estadísticas cuando el contrato del backend indique que existen datos.

La integración con estadísticas será tolerante a contratos incompletos: `GET /players/:id` ahora devuelve un arreglo de observaciones `estadisticas`, que puede estar vacío. La interfaz tratará una respuesta vacía, ausente, 404 o temporalmente fallida como “Estadísticas no disponibles”, sin bloquear el catálogo. Como el listado todavía no informa disponibilidad por jugador, todas las cards pueden abrir una ficha segura y el detalle decide si muestra estadísticas o ausencia de datos.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19

**Primary Dependencies**: Vite 6, React Router 7, cliente HTTP compartido basado en `fetch`, Vitest existente sin nuevos tests para esta iteración

**Storage**: No agrega almacenamiento en frontend; consume el catálogo y las estadísticas persistidas por el backend mediante REST

**Testing**: Validación manual de los escenarios de la spec, `npm run lint` y `npm run build`; no se agregarán tests automatizados de frontend por el alcance solicitado

**Target Platform**: Aplicación web de escritorio, servida por Vite; soporte mobile fuera de alcance

**Project Type**: Single-page web application con backend REST existente

**Performance Goals**: Mostrar el estado inicial de la pantalla dentro de 3 segundos después de recibir la respuesta del catálogo y mantener el filtrado interactivo sin nuevas consultas por cada carácter ingresado

**Constraints**: El endpoint de listado actual solo acepta `ligaCodigo`; los filtros de nombre y equipo se resolverán sobre el conjunto cargado. El listado actual no expone foto ni disponibilidad de estadísticas. El detalle devuelve `estadisticas` como arreglo y puede devolverlo vacío. La UI debe tolerar esos campos ausentes y no inventar datos.

**Scale/Scope**: Una pantalla de catálogo, una vista de detalle de estadísticas, una ruta protegida de entrada y un conjunto esperado de al menos 50 jugadores para validación manual

## Constitution Check

### Pre-Phase 0

- **I. Stack tecnológico**: PASS. El plan mantiene React + TypeScript y comunicación HTTP REST, tal como exige la constitución.
- **II. Arquitectura en capas**: PASS. La comunicación con el backend quedará en un módulo de API; las páginas y componentes solo coordinarán estado y presentación.
- **IV. Validación por nivel**: PASS. El frontend validará forma y estados de respuesta para presentar la UI; las reglas de identidad y persistencia continúan en el backend.
- **V. Tests**: EXCEPCIÓN DOCUMENTADA. La usuaria pidió no incorporar tests frontend en esta iteración. No se modifican ni eliminan tests existentes. La excepción queda pendiente para la definición de terminado del proyecto.
- **VI. Definición de terminado**: EXCEPCIÓN DOCUMENTADA. Se verificará compilación, lint y escenarios manuales; esta feature no podrá considerarse plenamente conforme a la constitución hasta resolver la decisión sobre tests.
- **VII. Idioma**: PASS. Los textos visibles y mensajes estarán en español; los identificadores nuevos no incluirán acentos ni ñ.
- **IX. Integraciones externas**: PASS. El frontend solo consume el backend; la indisponibilidad de estadísticas no interrumpe la lectura del catálogo.

**Gate decision**: PASS CON EXCEPCIÓN EXPLÍCITA DE TESTS. No hay bloqueos técnicos para diseñar o implementar la pantalla. La excepción debe mantenerse visible en tareas y cierre.

## Research Summary

Las decisiones de diseño y sus alternativas están documentadas en [research.md](./research.md). Los puntos principales son:

1. Reutilizar React Router, el `AuthContext`, `ProtectedRoute` y `shared/http-client.ts` existentes; no incorporar una librería de UI.
2. Cargar el catálogo una vez y resolver búsqueda, equipo y disponibilidad en la vista, porque el endpoint actual solo soporta filtro por liga.
3. Modelar foto, disponibilidad y estadísticas como datos opcionales para que la UI sea compatible con el listado actual y con el arreglo de observaciones del detalle.
4. Mantener la ruta de entrada protegida `/app` y agregar `/app/players/:id/estadisticas` para el detalle.

## Project Structure

### Documentation (this feature)

```text
specs/007-catalogo-visual-jugadores/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── frontend-player-catalog.md
└── tasks.md                 # Se generará con $speckit-tasks
```

### Source Code (repository root)

```text
frontend/src/
├── app/
│   └── ProtectedRoute.tsx             # Existente; se reutiliza
├── auth/                              # Existente; se reutiliza AuthContext y sesión
├── shared/
│   └── http-client.ts                 # Existente; se reutiliza para REST y 401
├── players/
│   ├── player-types.ts                # Tipos de listado, detalle, estadísticas y filtros
│   ├── players-api.ts                 # Funciones REST autenticadas
│   ├── player-filters.ts              # Filtrado y derivación de opciones de la vista
│   ├── PlayersPage.tsx                # Catálogo, estados de carga/error/vacío
│   ├── PlayerCard.tsx                 # Card y estados de disponibilidad
│   ├── PlayerFilters.tsx              # Búsqueda, selects y limpieza
│   ├── PlayerStatsPage.tsx            # Detalle y tolerancia a estadísticas ausentes
│   └── players.css                    # Estilos web de la feature
├── App.tsx                            # Se agregarán rutas protegidas
└── App.css                            # Solo se tocará si hace falta integrar el layout existente
```

**Structure Decision**: Se selecciona una carpeta de feature `frontend/src/players/` porque el proyecto ya separa autenticación, aplicación y cliente HTTP, pero todavía no tiene una carpeta genérica de componentes. La feature encapsulará tipos, acceso REST, filtrado, páginas y estilos sin modificar la arquitectura backend.

## Implementation Sequence

### Phase 0: Research and contract alignment

- Confirmar los campos actuales de `GET /players` y `GET /players/:id`.
- Definir en el contrato la forma compatible de `fotoUrl`, `estadisticasDisponibles` y `estadisticas` opcionales.
- Acordar con la implementación backend que la ausencia temporal de estadísticas no se represente como error fatal del catálogo.

### Phase 1: Frontend foundation

- Crear tipos de jugador, equipo, liga, estadísticas, filtros y estados de consulta.
- Crear el módulo `players-api.ts` usando `request` y `withBearer` del cliente HTTP compartido.
- Crear la carga inicial del catálogo usando `GET /players` y conservar una copia sin filtrar para derivar resultados y opciones.

### Phase 2: Catalog UI

- Reemplazar la pantalla provisional de `/app` por la entrada al catálogo protegido, manteniendo el cierre de sesión.
- Implementar título, grilla de cards, placeholder de foto y estados de carga, vacío y error.
- Implementar búsqueda por nombre, filtros por liga/equipo/disponibilidad y limpieza completa.
- Mantener la semántica de teclado y el foco visible en filtros, cards activables y acciones.

### Phase 3: Statistics detail and resilience

- Agregar la ruta protegida `/app/players/:id/estadisticas`.
- Consultar `GET /players/:id` al abrir el detalle.
- Mostrar estadísticas completas o parciales, distinguir cero de ausencia y manejar respuesta sin estadísticas, 404, error o endpoint pendiente.
- Evitar navegación desde cards sin disponibilidad conocida; permitir volver siempre al catálogo.

### Phase 4: Manual validation and handoff

- Ejecutar `npm run lint` y `npm run build` dentro de `frontend`.
- Validar manualmente catálogo cargado, filtros, sin resultados, imagen ausente, estadísticas completas/parciales/ausentes y navegación por teclado.
- No modificar tests existentes ni agregar nuevos tests automatizados en esta iteración, dejando la excepción documentada.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Tests automatizados frontend diferidos | La usuaria pidió explícitamente no incluir tests en esta iteración | Omitir la nota ocultaría el conflicto con la constitución; agregar tests ahora contradice el alcance solicitado |
