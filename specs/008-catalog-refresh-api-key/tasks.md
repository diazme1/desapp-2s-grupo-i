# Tasks: Protección API key para refresh del catálogo

**Input**: Design documents from `/specs/008-catalog-refresh-api-key/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml` y `quickstart.md`.

**Scope guard**: Se mantiene JWT Bearer y se agrega `X-API-Key` únicamente a `POST /catalog/refresh`. No se agregan dependencias, entidades, migraciones ni persistencia. Ningún test existente se modifica ni elimina.

**Tests**: Son obligatorios por FR-015, la constitución y la solicitud explícita. Las tareas de tests se ejecutan antes de la implementación correspondiente cuando comparten el contrato.

**Canonical secret policy**: La generación oficial usa `randomBytes(32).toString('base64url')`. La validación operativa exige al menos 32 bytes UTF-8 sobre la cadena configurada, sin reglas alternativas de caracteres o bytes decodificados. Los placeholders rechazados en ambientes no-test son `change-me`, `changeme`, `your-api-key`, `your-secret`, `secret` y `test`, además de valores ausentes, vacíos, solo espacios, con espacios laterales o menores a 32 bytes UTF-8.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar el baseline y las restricciones antes de modificar runtime o soporte de tests.

- [X] T001 [P] Confirmar Node.js 22.11.x, TypeScript 5.7.3, NestJS 11.4.7, Jest 30 y la ausencia de dependencias nuevas revisando `backend/package.json`, `backend/package-lock.json` y `backend/tsconfig.json`.
- [X] T002 [P] Registrar el baseline que debe preservarse revisando `backend/src/players/players.controller.ts`, `backend/src/auth/guards/jwt-auth.guard.ts`, `backend/src/auth/auth.module.ts`, `backend/src/config/environment.ts`, `backend/src/configure-app.ts`, `backend/test/integration/players/catalog.spec.ts`, `backend/test/integration/players/players-integration-app.ts` y `backend/test/integration/auth/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implementar y probar la política criptográfica común antes de configurar el bootstrap o proteger el endpoint.

**Checkpoint**: El helper queda probado con la política canónica de 32 bytes UTF-8, comparación resistente y longitudes distintas controladas.

- [X] T003 Escribir primero los tests del helper en `backend/test/unit/auth/catalog-refresh-api-key.spec.ts`, cubriendo generación desde 32 bytes con base64url, mínimo de 32 bytes UTF-8 sobre la cadena configurada, clave válida, primer byte distinto, prefijo coincidente, clave vacía, espacios, placeholders evaluados solo como configuración, ausencia de comparación directa de strings y longitudes distintas sin invocar `timingSafeEqual`.
- [X] T004 Implementar el helper puro en `backend/src/auth/catalog-refresh-api-key.ts` con `node:crypto`, `randomBytes(32)`, validación de mínimo sobre bytes UTF-8, lista canónica de placeholders para configuración, buffers UTF-8, `crypto.timingSafeEqual` solo con longitudes iguales y rechazo sin logging ni secretos; hacer pasar `backend/test/unit/auth/catalog-refresh-api-key.spec.ts` sin agregar dependencias.

---

## Phase 3: User Story 2 - Iniciar la aplicación con un secreto seguro (Priority: P1)

**Goal**: Validar `CATALOG_REFRESH_API_KEY` antes del arranque no-test y dejar disponible el secreto mediante configuración validada, sin lecturas directas desde el guard.

**Independent Test**: Ejecutar `backend/test/unit/auth/environment-catalog-refresh-api-key.spec.ts` con ausencia, vacío, solo espacios, espacios laterales, menos de 32 bytes UTF-8, cada placeholder canónico, una cadena base64url válida y `NODE_ENV=test`; solo los casos permitidos deben pasar el bootstrap.

### Tests for User Story 2

- [X] T005 [US2] Escribir primero los tests de configuración en `backend/test/unit/auth/environment-catalog-refresh-api-key.spec.ts`, cubriendo ausencia, vacío, solo espacios, espacios laterales, menos de 32 bytes UTF-8, `change-me`, `changeme`, `your-api-key`, `your-secret`, `secret`, `test`, cadena válida y excepción controlada de `NODE_ENV=test`; capturar logs, trazas y excepciones durante cada bootstrap inválido y verificar que puedan informar el nombre `CATALOG_REFRESH_API_KEY` y la regla incumplida, pero no contengan el valor completo o parcial del secreto, su longitud, hash, prefijo ni fragmentos de credencial; verificar que la política de placeholders no se aplique al header recibido.

### Implementation for User Story 2

- [X] T006 [US2] Incorporar `CATALOG_REFRESH_API_KEY` al objeto de configuración validada en `backend/src/config/environment.ts`, reutilizar la política de `backend/src/auth/catalog-refresh-api-key.ts`, rechazar la configuración insegura solo en ambientes no-test, conservar el orden de validación existente y producir errores en español sin valor completo, parcial, longitud, hash, prefijo ni fragmento del secreto.

**Checkpoint**: El bootstrap no-test rechaza secretos inseguros y la aplicación dispone de una configuración validada lista para inyección.

---

## Phase 4: User Story 1 - Actualizar el catálogo con doble credencial (Priority: P1) 🎯 MVP

**Goal**: Exigir el JWT Bearer existente y una `X-API-Key` válida únicamente en `POST /catalog/refresh`, antes de ejecutar el Service o el Adapter.

**Independent Test**: Ejecutar `backend/test/unit/auth/catalog-refresh-api-key.guard.spec.ts` y `backend/test/integration/players/catalog-api-key.spec.ts`: la combinación válida devuelve 200 y ejecuta una actualización; cada credencial inválida devuelve 401, no ejecuta el refresh y no filtra secretos.

### Tests for User Story 1

- [X] T007 [US1] Escribir primero los tests unitarios del guard en `backend/test/unit/auth/catalog-refresh-api-key.guard.spec.ts`, construyéndolo con el secreto esperado inyectado por configuración y cubriendo header válido, ausente, vacío, solo espacios, espacios laterales, repetido, inválido y de longitud distinta; verificar 401 genérico, cero lectura de `process.env` por parte del guard y ausencia de API key, longitud, hash, prefijo o fragmento en errores.

### Implementation for User Story 1

- [X] T008 [US1] Implementar y registrar el provider explícito del secreto validado y `CatalogRefreshApiKeyGuard` en `backend/src/auth/auth.module.ts` y `backend/src/auth/guards/catalog-refresh-api-key.guard.ts`; recibir el secreto por constructor/inyección, leer únicamente `X-API-Key`, delegar en `backend/src/auth/catalog-refresh-api-key.ts`, no leer `process.env` ni usar fallback y responder 401 genérico.
- [X] T009 [US1] Componer `JwtAuthGuard` y `CatalogRefreshApiKeyGuard` únicamente en `POST /catalog/refresh` dentro de `backend/src/players/players.controller.ts`, conservar el delegado `ActualizarCatalogoService`, no modificar `backend/src/auth/guards/jwt-auth.guard.ts` y mantener sin API key las demás rutas.

### Integration tests for User Story 1

- [X] T010 [US1] Adaptar aditivamente el arnés en `backend/test/integration/players/players-integration-app.ts` para inyectar una fixture local mediante configuración validada en modo legacy, ofrecer modo strict sin inyección automática para la nueva suite, restaurar `CATALOG_REFRESH_API_KEY` al cerrar y no modificar `backend/test/integration/players/catalog.spec.ts` ni otros tests existentes.
- [ ] T011 [US1] Escribir y ejecutar la integración strict en `backend/test/integration/players/catalog-api-key.spec.ts`, cubriendo JWT válido + API key válida, JWT ausente, JWT malformado, JWT alterado, JWT vencido, JWT firmado con algoritmo no permitido, API key ausente, vacía, solo espacios, con espacios laterales, inválida de igual longitud e inválida de longitud distinta; capturar logs, trazas y excepciones durante cada rechazo y comprobar HTTP 200/401, resumen vigente, una única actualización, cero invocaciones en cada rechazo y que bodies 401, logs, trazas y excepciones no contengan API key/JWT completos o parciales, longitud, hash, prefijo, fragmento ni valor de `CATALOG_REFRESH_API_KEY`.

**Checkpoint**: `POST /catalog/refresh` exige ambas credenciales, usa configuración inyectada y no altera la autenticación de otros endpoints.

---

## Phase 5: User Story 3 - Compatibilidad, documentación y no regresión (Priority: P2)

**Goal**: Mantener el contrato de los demás endpoints y alinear Swagger, `/docs-json`, contrato estático, Postman, `.env.example`, README y quickstart sin secretos.

**Independent Test**: Ejecutar las regresiones y tests de documentación de esta fase junto con las suites existentes; confirmar que solo refresh usa API key, que OpenAPI expresa AND y que ningún body, error o artefacto contiene credenciales o metadatos derivados.

### Tests for User Story 3

- [X] T012 [P] [US3] Escribir la regresión de alcance en `backend/test/integration/auth/api-key-scope.spec.ts`, verificando que `GET /health`, `GET /auth/me` con Bearer y las lecturas del catálogo conservan headers, códigos, cuerpos, reglas de acceso y no requieren `X-API-Key`.
- [X] T013 [P] [US3] Escribir el test de contrato generado en `backend/test/integration/documentation/swagger-openapi.spec.ts`, verificando `/docs-json`, el scheme `catalogRefreshApiKey` como `apiKey` en `X-API-Key`, un único requisito AND con `bearerAuth`, respuestas documentadas y ausencia de API key, JWT, longitud, hash, prefijo o fragmento.
- [X] T014 [P] [US3] Escribir las comprobaciones de artefactos en `backend/test/unit/documentation/api-key-artifacts.spec.ts`, validando `docs/postman/players-catalog.postman_collection.json`, `backend/.env.example`, `README.md`, `backend/README.md`, `specs/008-catalog-refresh-api-key/contracts/openapi.yaml` y `specs/008-catalog-refresh-api-key/quickstart.md` sin secretos completos, parciales, derivados, fixtures ni valores de variable.

### Implementation for User Story 3

- [X] T015 [US3] Registrar `catalogRefreshApiKey` como security scheme `apiKey` en el header `X-API-Key` dentro de `backend/src/configure-app.ts`, sin modificar `document.security` global ni la metadata de rutas no relacionadas.
- [X] T016 [US3] Documentar en `backend/src/players/players.controller.ts` un único `@ApiSecurity({ bearerAuth: [], catalogRefreshApiKey: [] })` para refresh, incluyendo respuestas 200, 401, 422 y 503 sin ejemplos de secretos y sin alterar los guards de otros endpoints.
- [X] T017 [P] [US3] Alinear `specs/008-catalog-refresh-api-key/contracts/openapi.yaml` con `/catalog/refresh`, ambos security schemes, requisito AND, respuestas 200/401/422/503 y `ErrorResponse` genérico sin API key, JWT, longitud, hash, prefijo ni fragmentos.
- [X] T018 [P] [US3] Actualizar `docs/postman/players-catalog.postman_collection.json` con la variable vacía/no secreta `catalogRefreshApiKey`, el header `X-API-Key` solo en “Actualizar catálogo base” y descripciones que exijan JWT + API key sin persistir valores reales.
- [X] T019 [P] [US3] Actualizar `backend/.env.example` con `CATALOG_REFRESH_API_KEY=` vacío, mínimo de 32 bytes UTF-8, la lista canónica de placeholders, el comando `node -e` con `node:crypto.randomBytes(32).toString('base64url')` y advertencia de no versionar secretos.
- [X] T020 [P] [US3] Actualizar `README.md` y `backend/README.md` para documentar generación base64url desde 32 bytes, validación mínima sobre bytes UTF-8, inyección de configuración, header, doble autenticación, placeholders, 401 genérico y alcance exclusivo de refresh.
- [X] T021 [US3] Actualizar `specs/008-catalog-refresh-api-key/quickstart.md` con Bash y PowerShell, orden helper/configuración/guard/integración/documentación, todos los escenarios JWT/API key, aserciones de no filtración, `/docs`, `/docs-json`, Postman y lecturas sin API key.
- [X] T022 [US3] Ejecutar una auditoría explícita de filtración sobre `backend/src/auth/catalog-refresh-api-key.ts`, `backend/src/auth/guards/catalog-refresh-api-key.guard.ts`, `backend/src/config/environment.ts`, `backend/src/configure-app.ts`, `backend/.env.example`, `docs/postman/players-catalog.postman_collection.json`, `README.md`, `backend/README.md`, `specs/008-catalog-refresh-api-key/contracts/openapi.yaml` y `specs/008-catalog-refresh-api-key/quickstart.md`, confirmando ausencia de API key/JWT completos o parciales, longitud, hash, prefijo, fragmento, fixture y valor de variable.

**Checkpoint**: El runtime, `/docs-json`, contrato estático, Postman, ejemplos y documentación están alineados; los endpoints distintos de refresh conservan su comportamiento.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Ejecutar la validación completa y dejar evidencia de seguridad, compatibilidad y calidad.

- [X] T023 [P] Ejecutar `npm run build` desde `backend/package.json` y corregir únicamente errores introducidos por esta feature, sin agregar dependencias ni modificar tests existentes.
- [X] T024 [P] Ejecutar `npm run lint` desde `backend/package.json` sobre `backend/src/` y `backend/test/`, preservando las reglas de estilo existentes.
- [X] T025 [P] Ejecutar `npm run test:unit` desde `backend/package.json`, incluyendo `backend/test/unit/auth/catalog-refresh-api-key.spec.ts`, `backend/test/unit/auth/catalog-refresh-api-key.guard.spec.ts`, `backend/test/unit/auth/environment-catalog-refresh-api-key.spec.ts` y `backend/test/unit/documentation/api-key-artifacts.spec.ts`, sin modificar ni eliminar tests existentes.
- [ ] T026 Ejecutar `npm run test:integration` desde `backend/package.json` con Docker/Testcontainers, incluyendo `backend/test/integration/players/catalog-api-key.spec.ts`, `backend/test/integration/auth/api-key-scope.spec.ts`, `backend/test/integration/documentation/swagger-openapi.spec.ts` y todas las suites existentes sin editar sus archivos.
- [ ] T027 Ejecutar todos los escenarios de `specs/008-catalog-refresh-api-key/quickstart.md` contra el backend levantado, verificar HTTP 200/401, cero invocaciones en rechazos, errores de configuración sin secretos, `/docs-json`, Postman y lecturas locales sin API key.
- [X] T028 Confirmar el diff final de `backend/test/integration/players/catalog.spec.ts`, `backend/test/integration/auth/`, el resto de `backend/test/` y los archivos runtime/documentales para demostrar que no se modificó ni eliminó ningún test existente y que `X-API-Key` no quedó aplicada fuera de `POST /catalog/refresh`.
---

## Dependency Graph

```text
T001 + T002
    |
    v
T003 -> T004 -> T005 -> T006 -> T007 -> T008 -> T009 -> T010 -> T011
                                                                    |
                                  +---------------------------------+
                                  v                 v               v
                              T012 [P]          T013 [P]          T014 [P]
                                  \                 |               /
                                   +---------------+--------------+
                                                   v
                                                 T015 -> T016
                                                   |
                              +------------------+------------------+------------------+
                              v                  v                  v                  v
                         T017 [P]           T018 [P]           T019 [P]           T020 [P]
                              \                  |                  |                  /
                               +------------------+------------------+------------------+
                                                   |
                                                   v
                                                 T021 -> T022
                                                   |
                             +---------------------+---------------------+
                             v                     v                     v
                        T023 [P]              T024 [P]              T025 [P]
                             \                     |                     /
                              +--------------------+--------------------+
                                                   v
                                                 T026 -> T027 -> T028
```

### User story completion order

1. **Foundational**: T003-T004; helper criptográfico y política común.
2. **US2 (P1)**: T005-T006; configuración segura y provider-ready.
3. **US1 (P1)**: T007-T011; guard, composición JWT y refresh con doble credencial.
4. **US3 (P2)**: T012-T022; regresión, OpenAPI, Postman y documentación.
5. **Polish**: T023-T028; build, lint, tests completos, quickstart y diff final.

La prioridad P1 de US2 se ejecuta antes que US1 por la dependencia técnica explícita: el guard
no puede recibir un secreto seguro hasta que exista la configuración validada.

## Parallel Opportunities

- **Setup**: T001 y T002 pueden ejecutarse en paralelo porque solo inspeccionan archivos y
  baseline diferentes.
- **US3 tests**: T012, T013 y T014 pueden ejecutarse en paralelo después de T011 porque usan
  archivos distintos y prueban regresión, `/docs-json` y artefactos respectivamente.
- **US3 documentation**: T017, T018, T019 y T020 pueden ejecutarse en paralelo después de
  T016 porque modifican artefactos distintos y comparten el contrato runtime ya fijado.
- **Polish**: T023, T024 y T025 pueden ejecutarse en paralelo sobre un checkout estable; T026
  usa Docker/Testcontainers y se ejecuta después de ese grupo.

No se marcan como `[P]` las tareas que comparten helper, configuración, guard, Controller,
arnés de integración o quickstart. Las fases de helper, configuración y guard son secuenciales
por diseño test-first y por sus dependencias. La captura de no filtración está integrada en
T005 (bootstrap/US2) y T011 (rechazos HTTP/US1), por lo que no requiere tareas adicionales.

## MVP Strategy

### MVP funcional

El MVP funcional es **Foundation + US2 + US1**: política criptográfica, configuración validada,
provider inyectado, guard específico y composición JWT + API key en `POST /catalog/refresh`, con
tests unitarios e integración strict.

### MVP apto para despliegue

El MVP apto para un ambiente no-test incluye también la validación de no filtración y la
documentación mínima de US3. Sin configuración segura, el endpoint no puede desplegarse de
forma confiable; sin las verificaciones de US3 no queda demostrado el alcance exclusivo.

### Entrega incremental

1. T003-T006: helper y bootstrap seguro.
2. T007-T011: protección funcional del refresh.
3. T012-T022: compatibilidad, contrato y operación.
4. T023-T028: validación transversal y evidencia final.

## Independent Test Criteria by User Story

- **US1**: `backend/test/integration/players/catalog-api-key.spec.ts` debe devolver 200 y una
  única actualización con JWT + API key válidos; cada caso inválido debe devolver 401, cero
  invocaciones y body sin credenciales ni metadatos derivados.
- **US2**: `backend/test/unit/auth/environment-catalog-refresh-api-key.spec.ts` debe rechazar
  configuraciones inseguras no-test, aceptar una cadena válida de al menos 32 bytes UTF-8,
  rechazar los seis placeholders, capturar logs/trazas/excepciones y no incluir valores ni
  metadatos derivados en errores; `NODE_ENV=test` solo permite la fixture controlada de
  bootstrap.
- **US3**: `backend/test/integration/auth/api-key-scope.spec.ts`,
  `backend/test/integration/documentation/swagger-openapi.spec.ts` y
  `backend/test/unit/documentation/api-key-artifacts.spec.ts` deben confirmar alcance exclusivo,
  security requirement AND y ausencia de secretos en documentación/artefactos.

## Task Summary

- **Total**: 28 tareas.
- **Setup**: 2 tareas (T001-T002).
- **Foundational**: 2 tareas (T003-T004).
- **US2**: 2 tareas (T005-T006).
- **US1**: 5 tareas (T007-T011).
- **US3**: 11 tareas (T012-T022).
- **Polish y validación transversal**: 6 tareas (T023-T028).
- **Paralelizables**: T001-T002, T012-T014, T017-T020 y T023-T025; todas están marcadas `[P]` únicamente cuando no comparten archivos ni dependencias incompletas.
