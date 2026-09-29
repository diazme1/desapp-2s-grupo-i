# Tasks: Integración continua del proyecto

**Input**: Documentos de diseño en `/specs/003-configure-ci/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ci-validation-contract.md`, `quickstart.md`

**Tests**: La especificación exige conservar y ejecutar todas las suites existentes y agregar una prueba de integración de persistencia con PostgreSQL real. No se modificarán, moverán, deshabilitarán ni saltearán tests existentes.

**Alcance**: Solo se valida el backend NestJS existente bajo `backend/`. No se agregan build, dependencias, scaffolding ni tests de frontend; tampoco se incorpora el paquete end-to-end pendiente.

**Organization**: Las tareas están agrupadas por historia de usuario. Como las cuatro historias son P1 y todas describen gates obligatorios del mismo CI, el incremento aceptable requiere completar US1–US4.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo porque afecta archivos distintos y no depende de una tarea incompleta.
- **[Story]**: Historia de usuario cubierta por la tarea.
- Todas las tareas incluyen rutas exactas de los archivos que crean, modifican o verifican.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear el punto de entrada versionado del CI sin ampliar el alcance del repositorio.

- [x] T001 Crear la estructura base del workflow backend-only, con nombre descriptivo y runner Linux, en `.github/workflows/ci.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establecer la topología y las restricciones comunes que bloquean todas las historias.

**⚠️ CRITICAL**: Ninguna historia queda completa hasta que existan checks separados, permisos mínimos y dependencias explícitas.

- [x] T002 Definir en `.github/workflows/ci.yml` permisos globales `contents: read` y los jobs identificables `build-unit`, `integration`, `sonar` y `docker-smoke`, dejando `sonar` a la espera de los productores mediante `needs` pero habilitado con una condición equivalente a `always() && !cancelled()`, y los demás jobs sin dependencias artificiales

**Checkpoint**: La estructura permite implementar cada gate sin agregar PostgreSQL mediante `services:`, cache prematura, publicación de imágenes, frontend ni end-to-end.

---

## Phase 3: User Story 1 - Validar automáticamente cambios integrables (Priority: P1)

**Goal**: Iniciar el CI para los cuatro eventos incluidos y presentar como inválida cualquier ejecución con un check obligatorio fallido u omitido.

**Independent Test**: Verificar la sintaxis del workflow y dispararlo mediante push a `main` y `dev`, y mediante creación/actualización de Pull Requests hacia ambas ramas; un fallo controlado en un check debe dejar la ejecución fallida y la categoría debe ser identificable.

### Implementation for User Story 1

- [x] T003 [US1] Configurar en `.github/workflows/ci.yml` los triggers `push` para `main` y `dev`, y `pull_request` con bases `main` y `dev` y activity types explícitos `opened`, `reopened`, `synchronize` y `edited`, de modo que un cambio de rama base vuelva a evaluar el destino vigente
- [x] T004 [US1] Configurar en `.github/workflows/ci.yml` nombres visibles y semántica fail-closed para los cuatro jobs obligatorios, sin `continue-on-error` ni un agregador que convierta checks omitidos o fallidos en éxito
- [ ] T005 [US1] Validar la matriz de eventos, incluido el retarget de una Pull Request mediante `edited`, y la propagación de fallos de `.github/workflows/ci.yml`, y registrar links o identificadores de las ejecuciones verificadas en `specs/003-configure-ci/quickstart.md`

**Checkpoint**: Los cuatro eventos correctos disparan el workflow y los checks obligatorios conservan resultados visibles y bloqueantes.

---

## Phase 4: User Story 2 - Verificar compilación y suites de tests (Priority: P1)

**Goal**: Compilar el backend, ejecutar por separado unitarios sin infraestructura e integraciones con Docker, y producir los LCOV de la misma revisión.

**Independent Test**: Ejecutar `npm ci`, `npm run build`, el descubrimiento dinámico y la suite unitaria con coverage, y el descubrimiento dinámico y la suite de integración con coverage; confirmar que todos los archivos `*.spec.ts` de cada ruta aparecen en `--listTests`, que los unitarios no usan Docker y que PostgreSQL 16 es creado por Testcontainers, sin utilizar cantidades fijas como guard.

### Tests for User Story 2

- [ ] T006 [P] [US2] Crear en `backend/test/integration/users/typeorm-user.repository.spec.ts` una suite descubierta por `npm run test:integration` que levante `postgres:16-alpine` con `GenericContainer`, construya el `DataSource` con host/puerto efímeros, ejecute `backend/migrations/1710000000000-CreateUsuarios.ts` y pruebe creación y lectura normalizada mediante `TypeOrmUserRepository`
- [ ] T007 [US2] Agregar en `backend/test/integration/users/typeorm-user.repository.spec.ts` un caso borde de correo duplicado o búsqueda inexistente y cleanup robusto que destruya el `DataSource` antes de detener el contenedor aun cuando falle una aserción

### Implementation for User Story 2

- [x] T008 [P] [US2] Implementar el job `build-unit` en `.github/workflows/ci.yml` con checkout, Node.js 22.11.0, `npm ci` usando `backend/package-lock.json`, comparación del conjunto de `backend/test/unit/**/*.spec.ts` con `npm run test:unit -- --listTests`, `npm run build` y `npm run test:unit -- --coverage --coverageDirectory=coverage/unit`
- [ ] T009 [US2] Implementar el job `integration` en `.github/workflows/ci.yml` con checkout, Node.js 22.11.0, `npm ci`, diagnóstico `docker info`, comparación del conjunto de `backend/test/integration/**/*.spec.ts` con `npm run test:integration -- --listTests` y `npm run test:integration -- --coverage --coverageDirectory=coverage/integration`, usando el Docker daemon del runner y sin `services.postgres`
- [ ] T010 [US2] Publicar desde `.github/workflows/ci.yml` cada `backend/coverage/unit/lcov.info` o `backend/coverage/integration/lcov.info` que exista como artefacto separado, informar reportes ausentes sin convertirlos en un gate independiente y no subir dependencias, secretos ni otros outputs
- [ ] T011 [US2] Ejecutar los comandos de build, descubrimiento, unitarios e integración definidos a partir de `backend/package.json` y `backend/jest.config.cjs`, comprobar que cada archivo de suite de las rutas vigentes es descubierto sin conteos fijos y registrar la evidencia local o del runner en `specs/003-configure-ci/quickstart.md`

**Checkpoint**: Build y suites son checks distinguibles; la cobertura de descubrimiento se valida dinámicamente, los unitarios no usan infraestructura, la persistencia usa PostgreSQL real administrado por Testcontainers y cada LCOV generado queda disponible para Sonar.

---

## Phase 5: User Story 3 - Comprobar que el entregable levanta y responde (Priority: P1)

**Goal**: Construir la imagen local vigente, iniciar exactamente esa imagen y comprobar `GET /health` con timeout, diagnóstico y cleanup.

**Independent Test**: Ejecutar `docker-smoke` y confirmar que construye desde `backend/Dockerfile` con contexto `backend`, mantiene el proceso activo y recibe HTTP 200 con `status: ok`; provocar un startup fallido y confirmar diagnóstico antes del cleanup dentro de 60 segundos.

### Implementation for User Story 3

- [ ] T012 [US3] Implementar en `.github/workflows/ci.yml` el build de una imagen local con tag único desde `backend/Dockerfile` y contexto `backend`, y arrancar esa misma imagen sin registry con `NODE_ENV=production`, `PORT=3000`, `JWT_EXPIRES_IN=15m`, `JWT_ALGORITHM=HS256`, un `JWT_SECRET` sintético válido y sin `DATABASE_URL`
- [ ] T013 [US3] Implementar en `.github/workflows/ci.yml` reintentos acotados contra `http://127.0.0.1:3000/health` que exijan HTTP 200 y cuerpo con `status: ok`, revisen que el contenedor continúe activo y finalicen en éxito o falla dentro de 60 segundos
- [ ] T014 [US3] Agregar en `.github/workflows/ci.yml` diagnóstico condicionado a falla con `docker ps -a`, `docker inspect` y `docker logs`, seguido de cleanup `always()` limitado al nombre y tag creados por el job
- [ ] T015 [US3] Ejecutar el smoke feliz y los escenarios controlados de proceso terminado y timeout descritos para `backend/Dockerfile`, y registrar la evidencia diagnóstica en `specs/003-configure-ci/quickstart.md`

**Checkpoint**: La imagen no se publica, el contenedor levanta desde el artefacto construido, health responde y toda falla de startup es finita, diagnosticable y limpia sus recursos propios.

---

## Phase 6: User Story 4 - Controlar calidad y seguridad antes de integrar (Priority: P1)

**Goal**: Analizar cada push incluido y cada Pull Request aplicable con SonarQube Cloud, importar cada LCOV disponible y bloquear la integración cuando el Quality Gate falle o no se resuelva.

**Independent Test**: Ejecutar el análisis en pushes y Pull Requests del mismo repositorio con ambos LCOV, con uno y sin reportes; comprobar que cada reporte disponible se importa, que Sonar nunca se omite por su ausencia, que un Quality Gate aprobado deja el job exitoso, que una infracción controlada o timeout lo hace fallar y que la Pull Request muestra estado y enlace al detalle. En una Pull Request desde fork, comprobar que solo se omite el scanner y que ningún step accede a secretos.

### Implementation for User Story 4

- [ ] T016 [P] [US4] Importar y vincular el proyecto real en SonarQube Cloud, verificar organization, project key, región y suscripción compatible con `dev`, desactivar Automatic Analysis, autorizar la GitHub App y documentar únicamente esos valores no secretos en `specs/003-configure-ci/quickstart.md`
- [ ] T017 [US4] Crear `SONAR_TOKEN` con el menor alcance de `Execute Analysis` disponible y configurarlo como GitHub Repository Secret, registrando solo la confirmación de su presencia y nunca su valor en `specs/003-configure-ci/quickstart.md`
- [ ] T018 [US4] Crear `backend/sonar-project.properties` con organization/project key verificados, `sonar.sources=src`, `sonar.tests=test`, exclusiones explícitas del plan, rutas de ambos LCOV, UTF-8, `sonar.qualitygate.wait=true` y timeout de 300 segundos
- [ ] T019 [US4] Implementar el job `sonar` en `.github/workflows/ci.yml` con checkout de historial completo, restauración opcional de cada LCOV disponible, visibilidad de reportes ausentes y ejecución de `SonarSource/sonarqube-scan-action@v8` con project base `backend` y `SONAR_TOKEN` únicamente desde GitHub Secrets; ejecutar el scanner para pushes y PRs del mismo repositorio aunque falte coverage, y omitir solo esos steps en forks sin usar `pull_request_target`
- [ ] T020 [US4] Validar en GitHub el análisis de pushes y Pull Requests del mismo repositorio, la importación de cada reporte disponible declarado en `backend/sonar-project.properties`, la ejecución sin LCOV y la decoración de PR con estado y enlace; comprobar además que una PR desde fork conserva checks sin secretos y no accede a `SONAR_TOKEN`, registrando evidencia en `specs/003-configure-ci/quickstart.md`

**Checkpoint**: Sonar analiza las cuatro clases de evento, consume coverage de la misma revisión y su Quality Gate es visible y bloqueante.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificar el contrato completo, los casos negativos y el cumplimiento constitucional antes del cierre.

- [ ] T021 Configurar las reglas de protección de `main` y `dev` según `specs/003-configure-ci/spec.md` para requerir `build-unit`, `integration`, `sonar` y `docker-smoke`, verificar que el job `sonar` espera el Quality Gate en revisiones del mismo repositorio y deja un resultado no aplicable sin secretos para forks, y documentar la decoración adicional publicada por Sonar
- [ ] T022 Ejecutar en ramas descartables los casos negativos de build, unitarios, integración y Docker/Testcontainers de `specs/003-configure-ci/quickstart.md`, sin modificar ni deshabilitar tests existentes, y registrar que cada falla vuelve fallido su check
- [ ] T023 Ejecutar en ramas descartables los casos negativos de Docker build, startup, health timeout y Quality Gate de `specs/003-configure-ci/quickstart.md`, y registrar que los logs aparecen antes del cleanup y que ningún fallo se presenta como integrable
- [ ] T024 Auditar `.github/workflows/ci.yml`, `backend/sonar-project.properties` y `backend/test/integration/users/typeorm-user.repository.spec.ts` contra `specs/003-configure-ci/spec.md`, `specs/003-configure-ci/plan.md` y `.specify/memory/constitution.md`, confirmando descubrimiento dinámico, coverage opcional para Sonar, aislamiento de secretos en forks y ausencia de frontend, end-to-end, `services.postgres`, secretos productivos, publicación de imágenes o cambios a tests existentes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias.
- **Foundational (Phase 2)**: Depende de T001 y bloquea la incorporación ordenada de los cuatro gates.
- **US1 (Phase 3)**: Depende de Phase 2; define cuándo se ejecuta el pipeline y cómo expone sus resultados.
- **US2 (Phase 4)**: Depende de Phase 2 y puede desarrollarse en paralelo con US1 y US3.
- **US3 (Phase 5)**: Depende de Phase 2 y puede desarrollarse en paralelo con US1 y el test de persistencia de US2; no depende del Docker image para ejecutar tests.
- **US4 (Phase 6)**: T016–T017 completan las precondiciones externas antes de configurar o ejecutar el scan; T018 puede avanzar después del onboarding y T019 espera a los productores de US2 sin exigir que ambos LCOV existan.
- **Polish (Phase 7)**: Depende de US1–US4 completas y de las precondiciones externas de Sonar configuradas.

### User Story Dependencies

- **US1 (P1)**: No depende funcionalmente de otra historia para validar filtros de eventos, pero la “ejecución completa” de la especificación solo existe cuando US2–US4 aportan todos los gates.
- **US2 (P1)**: Independiente de la imagen Docker de la aplicación; requiere Docker únicamente para el PostgreSQL administrado por Testcontainers.
- **US3 (P1)**: Independiente del build y de las suites porque `backend/Dockerfile` instala y arranca su propio artefacto.
- **US4 (P1)**: El onboarding y el Repository Secret preceden al scan; el job espera a US2 para consumir los LCOV disponibles, pero no depende de que exista alguno.

### Within Each User Story

- **US1**: T003 → T004 → T005.
- **US2**: T006 → T007; T008 puede ejecutarse en paralelo con T006–T007; T009 → T010 → T011.
- **US3**: T012 → T013 → T014 → T015.
- **US4**: T016 → T017 → T018 → T019 → T020.

### Parallel Opportunities

- T006 y T008 pueden ejecutarse en paralelo porque crean/modifican archivos distintos.
- T016 puede ejecutarse en paralelo con US1, US2 y US3; dentro de US4, sus precondiciones deben completarse antes de T017–T020.
- Tras Phase 2, US1, US2 y US3 pueden desarrollarse simultáneamente, coordinando los cambios compartidos en `.github/workflows/ci.yml`.
- El job `docker-smoke` podrá ejecutarse en paralelo con `build-unit` e `integration`; `sonar` esperará que finalicen ambos productores, pero consumirá únicamente los LCOV disponibles.

---

## Parallel Example: User Story 2

```text
Task T006: Crear la integración PostgreSQL/Testcontainers en backend/test/integration/users/typeorm-user.repository.spec.ts
Task T008: Implementar build-unit en .github/workflows/ci.yml
```

## Parallel Example: User Story 4

```text
Task T016: Completar onboarding y configuración externa de Sonar documentada en specs/003-configure-ci/quickstart.md
En paralelo: completar US1 y US3, y T006–T010 de US2
```

---

## Implementation Strategy

### MVP

No existe un MVP aceptable limitado solo a US1: la especificación clasifica US1–US4 como P1 y define compilación, suites, Quality Gate y smoke Docker como verificaciones obligatorias. El primer incremento integrable es:

1. Completar Setup y Foundational.
2. Completar US1, US2 y US3 en paralelo cuando sea posible.
3. Completar US4 después de finalizar los productores de coverage, sin exigir que ambos LCOV existan.
4. Ejecutar Phase 7 y validar todos los checks requeridos.

### Incremental Delivery

1. **Estructura y eventos**: T001–T005 dejan visible la topología y la matriz de ejecución.
2. **Código verificable**: T006–T011 agregan build, suites separadas, PostgreSQL/Testcontainers y coverage.
3. **Artefacto ejecutable**: T012–T015 demuestran build, startup y health de la imagen.
4. **Gate de calidad**: T016–T020 incorporan Sonar y bloquean ante un Quality Gate no aprobado.
5. **Cierre**: T021–T024 prueban protección de ramas, casos negativos, cleanup y alcance.

### Parallel Team Strategy

1. Completar T001–T002.
2. Coordinar tres líneas de trabajo: test de persistencia (`backend/test/integration/users/typeorm-user.repository.spec.ts`), smoke/CI (`.github/workflows/ci.yml`) y onboarding/configuración Sonar (`backend/sonar-project.properties`).
3. Integrar los LCOV antes de finalizar el job Sonar.
4. Ejecutar en conjunto la matriz remota y los casos negativos.

---

## Notes

- Los comandos npm provienen de `backend/package.json`; las opciones de coverage se pasan a Jest sin renombrar scripts.
- Los tests existentes quedan protegidos y el guard de descubrimiento usa rutas y `--listTests`, nunca una cantidad fija; la única suite nueva es `backend/test/integration/users/typeorm-user.repository.spec.ts`.
- PostgreSQL pertenece al ciclo de vida de Testcontainers; el workflow no crea un servicio duplicado ni ejecuta limpieza Docker global.
- `SONAR_TOKEN` es el único secret nuevo y nunca se versiona.
- Sonar consume cada LCOV disponible, pero su ausencia aislada no omite el scan ni agrega un gate independiente.
- Las Pull Requests desde forks ejecutan checks sin secretos cuando sea posible; no ejecutan Sonar ni usan `pull_request_target`.
- La imagen es local y efímera; no hay login ni push a registry.
- Los pasos que dependen de configuración externa deben registrar evidencia verificable, no valores secretos.
