# Tasks: Autenticacion del frontend

**Input**: Design documents from `specs/006-auth-frontend/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md`

**Tests**: Se incluyen pruebas unitarias y de componentes para validar casos felices y borde.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear la aplicacion Vite + React + TypeScript y sus herramientas de ejecucion.

- [X] T001 Crear la aplicacion Vite con plantilla React TypeScript dentro de `frontend/`, incluyendo `frontend/index.html`, `frontend/src/main.tsx` y configuracion base.
- [X] T002 [P] Configurar scripts, dependencias de runtime y dependencias de pruebas en `frontend/package.json`.
- [X] T003 [P] Configurar TypeScript, Vite y el proxy `/api` hacia `http://localhost:3000` en `frontend/tsconfig.json`, `frontend/vite.config.ts` y `frontend/.env.example`.
- [X] T004 [P] Configurar Vitest, jsdom, Testing Library y limpieza de mocks en `frontend/vite.config.ts` y `frontend/src/test/setup.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Crear los contratos, el cliente HTTP y la base visual que necesitan las tres historias.

**Checkpoint**: La aplicacion inicia, el build funciona y la capa compartida puede enviar requests con la credencial Bearer.

- [X] T005 [P] Definir los tipos de formularios, usuario publico, respuesta de token, sesion y errores en `frontend/src/auth/auth-types.ts`.
- [X] T006 [P] Implementar el cliente HTTP con base URL configurable, serializacion JSON y manejo uniforme de errores HTTP en `frontend/src/shared/http-client.ts`.
- [X] T007 [P] Implementar validaciones de correo, contrasena y confirmacion en `frontend/src/auth/auth-validation.ts`.
- [X] T008 [P] Implementar lectura, escritura y limpieza de la sesion en `frontend/src/auth/auth-storage.ts`, usando `sessionStorage` sin guardar contrasenas.
- [X] T009 Crear la estructura de navegacion inicial y estilos globales en `frontend/src/app/App.tsx`, `frontend/src/app/ProtectedRoute.tsx`, `frontend/src/auth/AuthLayout.tsx` y `frontend/src/auth/auth.css`.

---

## Phase 3: User Story 1 - Crear una cuenta desde el frontend (Priority: P1) MVP

**Goal**: Permitir registrar una cuenta desde una pantalla usable, validada y conectada al endpoint existente.

**Independent Test**: Completar registro valido, comprobar confirmacion y navegar al login; probar validaciones locales y correo duplicado.

### Tests for User Story 1

- [X] T010 [P] [US1] Agregar pruebas de validacion de registro y confirmacion de contrasena en `frontend/src/test/RegisterPage.test.tsx`.
- [X] T011 [P] [US1] Agregar pruebas del contrato de registro, exito, conflicto, validacion y error de conexion en `frontend/src/test/auth-api.test.ts`.

### Implementation for User Story 1

- [X] T012 [US1] Implementar la operacion `register` contra `POST /auth/register` en `frontend/src/auth/auth-api.ts`.
- [X] T013 [US1] Implementar el formulario de registro, estado de carga, validaciones y mensajes en `frontend/src/auth/RegisterPage.tsx`.
- [X] T014 [US1] Integrar enlaces entre registro y login y el mensaje posterior a un alta exitosa en `frontend/src/auth/RegisterPage.tsx` y `frontend/src/app/App.tsx`.

**Checkpoint**: El registro funciona de forma independiente y no crea ni persiste una sesion implicita.

---

## Phase 4: User Story 2 - Iniciar sesion (Priority: P1)

**Goal**: Permitir iniciar sesion con credenciales validas y bloquear el acceso ante credenciales invalidas.

**Independent Test**: Ingresar credenciales validas para acceder a `/app`, repetir con credenciales invalidas y verificar que no haya sesion.

### Tests for User Story 2

- [X] T015 [P] [US2] Agregar pruebas de validacion, carga, exito y error generico de login en `frontend/src/test/LoginPage.test.tsx`.
- [X] T016 [P] [US2] Agregar pruebas de `login` y `me` contra sus respuestas exitosas y errores 401/403 en `frontend/src/test/auth-api.test.ts`.

### Implementation for User Story 2

- [X] T017 [US2] Implementar las operaciones `login` y `me` contra `POST /auth/login` y `GET /auth/me` en `frontend/src/auth/auth-api.ts`.
- [X] T018 [US2] Implementar el formulario de login con validacion, estado de carga y mensaje generico para credenciales invalidas en `frontend/src/auth/LoginPage.tsx`.
- [X] T019 [US2] Implementar el proveedor de autenticacion y el acceso al usuario actual en `frontend/src/auth/auth-context.tsx`.
- [X] T020 [US2] Implementar la ruta protegida y la pantalla provisional autenticada en `frontend/src/app/ProtectedRoute.tsx`, `frontend/src/app/App.tsx` y `frontend/src/auth/AuthLayout.tsx`.

**Checkpoint**: Login y registro funcionan juntos, pero un login invalido nunca habilita `/app`.

---

## Phase 5: User Story 3 - Mantener y cerrar la sesion (Priority: P1)

**Goal**: Mantener una sesion valida al recargar, cerrar sesion explicitamente y expulsar sesiones rechazadas o vencidas.

**Independent Test**: Autenticarse, recargar `/app`, cerrar sesion y volver a intentar la ruta protegida sin credenciales.

### Tests for User Story 3

- [X] T021 [P] [US3] Agregar pruebas de hidratacion desde `sessionStorage`, cierre de sesion y limpieza ante 401 en `frontend/src/test/AuthContext.test.tsx`.

### Implementation for User Story 3

- [X] T022 [US3] Completar hidratacion de sesion, calculo de vencimiento y recuperacion de `/auth/me` en `frontend/src/auth/auth-context.tsx`.
- [X] T023 [US3] Implementar cierre de sesion, limpieza de credenciales y redireccion a `/login` en `frontend/src/auth/auth-context.tsx` y `frontend/src/app/App.tsx`.
- [X] T024 [US3] Integrar el manejo global de respuestas 401/403 y los estados de sesion anonima, cargando, autenticada y vencida en `frontend/src/shared/http-client.ts` y `frontend/src/auth/auth-context.tsx`.

**Checkpoint**: La sesion se conserva solo mientras sea valida y el logout bloquea nuevamente las rutas protegidas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Completar accesibilidad, responsive, documentacion y validacion de la feature.

- [X] T025 [P] [US1] Aplicar diseno responsive, foco visible, etiquetas, autocomplete y mensajes no dependientes solo del color en `frontend/src/auth/auth.css`, `frontend/src/auth/LoginPage.tsx` y `frontend/src/auth/RegisterPage.tsx`.
- [X] T026 [P] Agregar README y variables de entorno del frontend en `frontend/README.md` y `frontend/.env.example`.
- [X] T027 [P] Verificar que el `.gitignore` raiz cubra `frontend/node_modules`, `frontend/dist`, `frontend/coverage` y archivos `.env` sin excluir `.env.example`.
- [X] T028 Ejecutar `npm test`, `npm run lint` y `npm run build` desde `frontend/`, resolver fallas y dejar evidencia en `specs/006-auth-frontend/validation.md`.
- [ ] T029 Ejecutar los escenarios manuales del quickstart con backend y frontend levantados y documentar el resultado en `specs/006-auth-frontend/validation.md`. Pendiente: Docker Desktop no permite acceder al motor PostgreSQL en este entorno.

---

## Phase 7: Full-stack Docker

**Purpose**: Permitir levantar PostgreSQL, backend y frontend con un unico comando de Docker Compose.

- [X] T030 Agregar `frontend/Dockerfile` y `frontend/.dockerignore` para ejecutar Vite en modo desarrollo dentro de un contenedor.
- [X] T031 Incorporar el servicio `frontend` a `docker-compose.yml`, con puerto `5173`, volumen de desarrollo y dependencia del servicio `api`.
- [X] T032 Hacer configurable el destino del proxy de Vite mediante `VITE_PROXY_TARGET` y documentar el arranque full-stack en `README.md` y `specs/006-auth-frontend/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; crea el proyecto Vite y las herramientas.
- **Foundational (Phase 2)**: Depende de Setup y bloquea las historias.
- **User Story 1 (Phase 3)**: Depende de Foundation; es el MVP minimo funcional.
- **User Story 2 (Phase 4)**: Depende de Foundation y reutiliza tipos, cliente y navegacion de US1.
- **User Story 3 (Phase 5)**: Depende del login de US2 porque necesita una sesion valida.
- **Polish (Phase 6)**: Depende de las tres historias implementadas.
- **Full-stack Docker (Phase 7)**: Depende de que frontend y backend tengan sus comandos de arranque definidos.

### Parallel Opportunities

- T002, T003 y T004 pueden ejecutarse en paralelo despues de T001.
- T005, T006, T007 y T008 pueden ejecutarse en paralelo despues de T001; T009 depende de los contratos base.
- T010 y T011 pueden ejecutarse en paralelo antes de T012-T014.
- T015 y T016 pueden ejecutarse en paralelo antes de T017-T020.
- T021 puede prepararse en paralelo con el trabajo visual de US3, pero debe ejecutarse antes de cerrar la historia.
- T025, T026 y T027 pueden ejecutarse en paralelo antes de T028-T029.

## Implementation Strategy

### MVP First

1. Completar Setup y Foundation.
2. Completar US1 para registrar cuentas y navegar al login.
3. Completar US2 para iniciar sesion y acceder a `/app`.
4. Validar el flujo integrado antes de ampliar el resto de la aplicacion.

### Incremental Delivery

1. Setup + Foundation: aplicacion ejecutable y contratos compartidos.
2. US1: registro usable y conectado.
3. US2: login y ruta protegida.
4. US3: persistencia temporal, expiracion y logout.
5. Polish: responsive, accesibilidad, documentacion y validacion final.
