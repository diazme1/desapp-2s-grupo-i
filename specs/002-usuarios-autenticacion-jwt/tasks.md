# Tasks: Usuarios y autenticación con JWT

**Input**: Documentos de diseño de `specs/002-usuarios-autenticacion-jwt/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md`.

## Phase 1: Setup

**Purpose**: Preparar dependencias y configuración compartida sin alterar los tests existentes.

- [X] T001 Agregar las dependencias de PostgreSQL, TypeORM, JWT, bcryptjs y validación en `backend/package.json` y regenerar `backend/package-lock.json`.
- [X] T002 [P] Extender `backend/.env.example` y `backend/src/config/environment.ts` con configuración validada de base de datos, secreto JWT y duración del token.
- [X] T003 [P] Actualizar `backend/README.md` con los prerrequisitos locales y las variables de entorno sin incluir secretos reales.

---

## Phase 2: Foundational

**Purpose**: Crear la infraestructura que bloquea las tres historias de usuario.

- [X] T004 Crear la configuración de conexión y migraciones de PostgreSQL en `backend/src/database/` y `backend/migrations/`.
- [X] T005 Crear los puertos de dominio para repositorio de usuarios, hash de contraseñas y emisión/verificación de tokens en `backend/src/users/` y `backend/src/auth/`.
- [X] T006 [P] Configurar el registro de `AuthModule`, `UsersModule` y la persistencia en `backend/src/app.module.ts`.
- [X] T007 [P] Agregar pruebas unitarias de configuración insegura y normalización de correo en `backend/test/unit/auth/`.
- [X] T008 Definir el manejo de errores de autenticación y respuestas 401/403/409/422 en `backend/src/common/filters/http-exception.filter.ts` y los DTO de `backend/src/auth/dto/`.

**Checkpoint**: La configuración, los puertos y la migración están listos antes de implementar historias.

---

## Phase 3: User Story 1 - Crear una cuenta (Priority: P1) 🎯 MVP

**Goal**: Registrar usuarios con correo normalizado y contraseña protegida.

**Independent Test**: Registrar una cuenta válida, repetir el correo y enviar datos inválidos; verificar creación única, validaciones y ausencia de contraseñas en respuestas.

### Tests for User Story 1

- [X] T009 [P] [US1] Crear pruebas unitarias del modelo y normalización de `Usuario` en `backend/test/unit/users/user.spec.ts`.
- [X] T010 [P] [US1] Crear pruebas de integración del registro, duplicados y validación en `backend/test/integration/auth/register.spec.ts`.

### Implementation for User Story 1

- [X] T011 [US1] Implementar el modelo de dominio `Usuario` en `backend/src/users/domain/user.ts` con sus invariantes.
- [X] T012 [US1] Implementar entidad, migración y repositorio TypeORM de usuarios en `backend/src/users/persistence/` y `backend/migrations/`.
- [X] T013 [US1] Implementar DTOs y validaciones de registro en `backend/src/auth/dto/register.dto.ts`.
- [X] T014 [US1] Implementar hash de contraseñas en `backend/src/auth/strategies/password-hasher.ts` sin exponer el secreto.
- [X] T015 [US1] Implementar `AuthService.register` y la respuesta pública de usuario en `backend/src/auth/auth.service.ts`.
- [X] T016 [US1] Implementar `POST /auth/register` y su documentación OpenAPI en `backend/src/auth/auth.controller.ts`.

**Checkpoint**: Una cuenta válida se crea una sola vez y la contraseña nunca aparece en almacenamiento, respuesta o logs.

---

## Phase 4: User Story 2 - Iniciar sesión y obtener acceso (Priority: P1)

**Goal**: Validar credenciales y emitir JWT firmado con vencimiento.

**Independent Test**: Iniciar sesión con credenciales válidas, incorrectas y con correo inexistente; verificar token solo en el caso válido.

### Tests for User Story 2

- [X] T017 [P] [US2] Crear pruebas unitarias del servicio de login, hash y emisión de claims en `backend/test/unit/auth/login.spec.ts`.
- [X] T018 [P] [US2] Crear pruebas de integración de `POST /auth/login` en `backend/test/integration/auth/login.spec.ts`.

### Implementation for User Story 2

- [X] T019 [US2] Implementar DTO de login y normalización de credenciales en `backend/src/auth/dto/login.dto.ts`.
- [X] T020 [US2] Implementar firma y verificación de JWT con secreto, expiración y algoritmo permitido configurables en `backend/src/auth/strategies/jwt-token.service.ts`.
- [X] T021 [US2] Implementar `AuthService.login` con error uniforme para credenciales inválidas en `backend/src/auth/auth.service.ts`.
- [X] T022 [US2] Implementar `POST /auth/login` y documentar la respuesta Bearer en `backend/src/auth/auth.controller.ts`.

**Checkpoint**: Solo credenciales válidas producen un JWT; ningún error revela si un correo está registrado.

---

## Phase 5: User Story 3 - Autorizar operaciones propias (Priority: P1)

**Goal**: Validar JWT Bearer, obtener la identidad desde `sub` y rechazar acceso a datos de otro usuario.

**Independent Test**: Consultar un recurso propio con token válido y repetir la operación intentando indicar el identificador de otro usuario.

### Tests for User Story 3

- [X] T023 [P] [US3] Crear pruebas unitarias del guard, extracción de `sub` y rechazo de tokens inválidos en `backend/test/unit/auth/jwt-auth.guard.spec.ts`.
- [X] T024 [P] [US3] Crear pruebas de integración de `GET /auth/me`, propiedad de datos y `/health` público en `backend/test/integration/auth/protected-routes.spec.ts`.

### Implementation for User Story 3

- [X] T025 [US3] Implementar `JwtAuthGuard` y extracción de identidad desde Bearer en `backend/src/auth/guards/jwt-auth.guard.ts`.
- [X] T026 [US3] Implementar `GET /auth/me` protegido y documentar `bearerAuth` en `backend/src/auth/auth.controller.ts`.
- [X] T027 [US3] Implementar la comprobación de propiedad que rechaza con 403 los recursos de otro usuario en `backend/src/auth/ownership/ownership.service.ts`.
- [X] T028 [US3] Revisar el registro de rutas para mantener `/health` público y evitar logs de credenciales o tokens en `backend/src/app.module.ts` y filtros.

**Checkpoint**: La identidad se obtiene solo con JWT válido; un usuario no puede consultar ni modificar datos de otro; `/health` continúa funcionando sin autenticación.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentar, validar y cerrar la feature sin presentar verificaciones pendientes como completadas.

- [X] T029 [P] Crear `docs/postman/auth.postman_collection.json` con registro, login, variable de token y `/auth/me`.
- [X] T030 [P] Actualizar `backend/README.md` y `specs/002-usuarios-autenticacion-jwt/quickstart.md` con comandos y casos de autenticación.
- [X] T031 Ejecutar `npm.cmd run build`, `npm.cmd run test:unit` y `npm.cmd run test:integration` desde `backend/` y registrar evidencia en `specs/002-usuarios-autenticacion-jwt/validation.md`.
- [X] T032 Ejecutar el quickstart, verificar Swagger/Postman, revisar que no haya secretos en logs y completar `specs/002-usuarios-autenticacion-jwt/validation.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: puede comenzar de inmediato.
- **Foundational (Phase 2)**: depende de Setup y bloquea las historias.
- **User Stories (Phases 3-5)**: dependen de Foundational; se recomienda registro antes de login y login antes de autorización.
- **Polish (Phase 6)**: depende de las tres historias implementadas.

### User Story Dependencies

- **US1**: comienza después de Phase 2 y habilita usuarios persistidos.
- **US2**: depende de US1 para validar credenciales existentes.
- **US3**: depende de US2 para obtener tokens de acceso.

### Parallel Opportunities

- T002, T003 y T007 pueden ejecutarse en paralelo.
- T009 y T010 pueden ejecutarse en paralelo antes de T011-T016.
- T017 y T018 pueden ejecutarse en paralelo antes de T019-T022.
- T023 y T024 pueden ejecutarse en paralelo antes de T025-T028.
- T029 y T030 pueden ejecutarse en paralelo después de las historias.

## Implementation Strategy

### MVP First

1. Completar Setup y Foundational.
2. Completar US1: registro de usuario.
3. Completar US2: login y JWT.
4. Completar US3: guard, propiedad y `/auth/me`.
5. Validar todo antes de comenzar el catálogo de jugadores.

### Incremental Delivery

Cada historia se prueba antes de avanzar a la siguiente. La feature queda lista cuando las
tres historias, Swagger, Postman, tests y quickstart están verificados.
