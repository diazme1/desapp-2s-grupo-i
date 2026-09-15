# Implementation Plan: Integración continua del proyecto

**Branch**: `feature/config-ci` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-configure-ci/spec.md`

## Summary

Implementar un workflow de GitHub Actions en `.github/workflows/ci.yml` para pushes a `main` y `dev`, y Pull Requests dirigidas a esas ramas. El diseño usa los scripts npm existentes, separa build/unitarios, integración, SonarQube Cloud y Docker smoke en jobs identificables, genera coverage LCOV sin volver a ejecutar suites, deja que un nuevo test de persistencia administre PostgreSQL mediante Testcontainers y valida la imagen local con `GET /health`. Sonar usa la integración oficial basada en CI, se ejecuta para pushes y Pull Requests del mismo repositorio aun cuando falte algún LCOV, espera un Quality Gate obligatorio y publica el resultado en GitHub.

## Aclaración de alcance: componentes existentes

- Actualmente el repositorio contiene únicamente el backend NestJS ubicado en `backend`.
- No existe todavía una implementación de frontend, ni `package.json`, lockfile, código fuente o tests de frontend que puedan validarse.
- Esta feature de CI MUST validar exclusivamente los componentes que existen actualmente en el repositorio.
- La implementación MUST NOT agregar build, dependencias, scaffolding, configuración ni tests de frontend.
- Cuando el frontend sea incorporado mediante una feature futura, esa feature MUST extender el CI con sus comandos y lockfile reales, manteniendo la separación de tests y las demás reglas de la Constitución vigente.

La Constitución continúa siendo normativa para el stack y la evolución del producto. Su declaración de React y TypeScript para el frontend define cómo deberá construirse ese componente cuando forme parte de una feature, pero MUST NOT interpretarse como obligación de crear componentes ausentes ni de ampliar el alcance actual del CI.

## Technical Context

**Language/Version**: Node.js `22.11.0`/`22.11.x`, npm `>=10`, TypeScript `5.7.3`

**Primary Dependencies**: NestJS 11, Jest 30, ts-jest 29, Testcontainers 11.5.1, PostgreSQL 16 Alpine, Docker, GitHub Actions y `SonarSource/sonarqube-scan-action@v8`

**Storage**: PostgreSQL efímero administrado por Testcontainers para la nueva integración de persistencia; repositorio en memoria para el smoke HTTP, que no necesita base de datos

**Testing**: `npm run test:unit` para `backend/test/unit`, `npm run test:integration` para `backend/test/integration`, ambos con coverage agregado mediante opciones de Jest; no existe paquete end-to-end

**Target Platform**: Runner Linux hospedado por GitHub con Docker daemon accesible; imagen local basada en el `backend/Dockerfile` existente

**Project Type**: Web service backend NestJS; el repositorio declara un frontend React como decisión de stack, pero todavía no contiene directorio, package ni lockfile de frontend

**Performance Goals**: El smoke HTTP debe decidir éxito o falla dentro de 60 segundos; el Quality Gate debe resolverse dentro de un timeout explícito de 300 segundos

**Constraints**: Instalación reproducible con `backend/package-lock.json`; descubrimiento recurrente de suites sin conteos fijos; sin PostgreSQL en `services:`; sin credenciales productivas; sin publicar imágenes; sin mover, modificar, deshabilitar ni omitir tests existentes; sin ejecutar end-to-end; sin `pull_request_target` ni workflows privilegiados para forks; sin cache explícita en la primera versión

**Scale/Scope**: Un package backend, actualmente con 9 suites unitarias y 4 suites de integración más una nueva suite de persistencia; estas cantidades son inventario de planificación y no se usan como guard del CI. Un proyecto SonarQube Cloud enfocado en `backend`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate previo a investigación: PASS

- **I. Stack tecnológico**: se mantienen Node.js, TypeScript, NestJS y PostgreSQL. La regla constitucional sobre React/TypeScript gobierna un frontend futuro, pero no obliga a crearlo dentro de esta feature; el CI actual solo valida el backend existente.
- **II-IV. Capas, modelo rico y validaciones**: el workflow no cambia capas ni reglas de dominio. La nueva prueba ejercita el Repository real sin trasladar lógica.
- **V. Tests**: los unitarios siguen sin infraestructura. La persistencia se prueba con PostgreSQL real administrado por Testcontainers. No se modifica, mueve, elimina, deshabilita ni saltea ningún test existente. El paquete end-to-end continúa fuera de alcance.
- **VI. Definición de terminado**: el diseño exige build exitoso, suites aprobadas, imagen construible, proceso estable y `GET /health` con HTTP 200. No hay endpoints nuevos, por lo que Postman y OpenAPI no requieren cambios.
- **VII. Idioma**: artefactos y mensajes propios de la feature se mantienen en español; nombres normativos y técnicos permanecen en inglés.
- **VIII-IX. Transacciones e integraciones externas del dominio**: no se alteran comportamientos de negocio ni adapters productivos.

No hay violaciones que requieran Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-configure-ci/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ci-validation-contract.md
└── tasks.md                       # Se generará con $speckit-tasks
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml                     # Nuevo workflow obligatorio

backend/
├── .dockerignore                  # Existente; aplica al contexto backend
├── Dockerfile                     # Existente; imagen validada por el smoke
├── jest.config.cjs                # Configuración existente de Jest/coverage
├── package.json                   # Scripts existentes, sin renombrarlos
├── package-lock.json              # Fuente reproducible de dependencias
├── sonar-project.properties       # Nueva configuración del proyecto Sonar
├── src/
└── test/
    ├── unit/                      # 9 suites existentes, sin cambios
    └── integration/
        ├── app-module.spec.ts     # Existente, sin persistencia
        ├── auth/                  # 3 suites existentes, en memoria
        └── users/
            └── typeorm-user.repository.spec.ts  # Nueva integración PostgreSQL
```

**Structure Decision**: El único componente implementado es `backend`, por lo que todas las operaciones npm usan ese working directory. `backend/sonar-project.properties` mantiene `sonar.sources=src`, `sonar.tests=test` y hace coincidir las rutas `SF:src/...` de LCOV con el project base directory. El frontend se incorporará al CI cuando exista un package y lockfile verificables; no se inventan comandos para un componente ausente.

## Diseño del workflow

### Eventos y permisos

- `push` se limita a `main` y `dev`.
- `pull_request` se limita a bases `main` y `dev` y declara explícitamente los activity types `opened`, `reopened`, `synchronize` y `edited`; este último vuelve a evaluar el filtro cuando cambia la rama base.
- Los permisos del workflow se reducen a `contents: read`. La decoración de Pull Requests corresponde a la GitHub App de SonarQube Cloud, no a permisos de escritura generales del workflow.
- El checkout usado por Sonar debe conservar el historial completo (`fetch-depth: 0`) para análisis de SCM y código nuevo confiables.
- Las Pull Requests desde forks ejecutan los jobs que no requieren secretos. Los steps del scanner no se ejecutan ni referencian `SONAR_TOKEN` en ese contexto; esta feature no usa `pull_request_target` ni agrega un workflow privilegiado alternativo.

### Grafo de jobs

1. **`build-unit`**: checkout, Node 22.11.0, `npm ci`, guard dinámico de descubrimiento, `npm run build` y `npm run test:unit` con coverage en `backend/coverage/unit/lcov.info`. Publica el LCOV cuando se genera.
2. **`integration`**: checkout, Node 22.11.0, `npm ci`, diagnóstico `docker info`, guard dinámico de descubrimiento y `npm run test:integration` con coverage en `backend/coverage/integration/lcov.info`. La nueva suite crea y elimina PostgreSQL 16 Alpine mediante `GenericContainer` de la dependencia `testcontainers` ya instalada. Publica el LCOV cuando se genera.
3. **`sonar`**: declara `needs` sobre `build-unit` e `integration` solo para esperar sus artefactos, pero usa una condición equivalente a `always() && !cancelled()` para no quedar omitido por resultados previos. En pushes y Pull Requests del mismo repositorio hace checkout con historial completo, restaura cada LCOV disponible en su ruta original, informa cuáles faltan y ejecuta el scanner oficial. La falta de uno o ambos LCOV no falla por sí sola ni omite el análisis; `sonar.qualitygate.wait=true` sí convierte un scan, Quality Gate o timeout fallido en falla del job. En Pull Requests desde forks no accede al secret ni ejecuta el scanner y deja visible que Sonar no aplica a esa revisión.
4. **`docker-smoke`**: puede ejecutarse en paralelo con los dos primeros jobs porque ningún test usa la imagen de la aplicación. Construye una etiqueta local desde `backend/Dockerfile` con contexto `backend`, inicia esa misma imagen, espera como máximo 60 segundos por HTTP 200 de `GET /health`, publica diagnóstico ante falla y siempre elimina el contenedor y la imagen creados explícitamente.

Los jobs son checks separados y visibles. Las reglas de protección de `main` y `dev` deben requerir `build-unit`, `integration`, `sonar` y `docker-smoke`. Para revisiones del mismo repositorio, el job `sonar` espera el Quality Gate y la GitHub App publica además el check decorado; para forks, el mismo job deja visible que el análisis no aplica sin acceder a secretos. No se agrega un job agregador que pueda ocultar o convertir en éxito un job omitido.

### Instalación, build y coverage

- Cada job npm instala con `npm ci` desde `backend/package-lock.json`; no usa `npm install` ni comandos inventados.
- `build-unit` reutiliza `npm run build` y `npm run test:unit`.
- `integration` reutiliza `npm run test:integration`.
- Antes de cada suite, el job obtiene los archivos `*.spec.ts` bajo su ruta correspondiente y compara ese conjunto con la salida de Jest `--listTests` usando el script existente de la suite. La comparación usa rutas, patrones y configuración vigentes, no un conteo fijo, por lo que nuevos tests legítimos quedan incorporados automáticamente y cualquier archivo no descubierto hace fallar su job.
- Para evitar una tercera ejecución duplicada con `npm run test:cov`, ambos scripts de suite reciben las opciones Jest `--coverage` y `--coverageDirectory` después de `--`. Los reportes quedan separados y Sonar consume ambos mediante una lista de rutas LCOV.
- Cada artefacto LCOV se publica cuando existe. La ausencia de uno o ambos se informa en logs y al job Sonar, pero no se transforma en un gate independiente ni impide ejecutar el scanner; una falla real de build o suite sigue fallando su job productor.
- No se modifica `backend/jest.config.cjs` ni los scripts existentes. `src/main.ts` conserva la exclusión de coverage ya definida por Jest.
- No se agrega cache explícita. El primer objetivo es reproducibilidad y diagnóstico; una optimización posterior podrá evaluar el cache npm basado exclusivamente en el lockfile.

### Persistencia con Testcontainers

- Los tests actuales no usan Testcontainers y todos trabajan sin persistencia. Para demostrar el requisito, se agrega `backend/test/integration/users/typeorm-user.repository.spec.ts` sin tocar las 13 suites existentes.
- La nueva suite usa `GenericContainer` de `testcontainers` con `postgres:16-alpine`, alineada con `docker-compose.yml`; configura credenciales efímeras, espera disponibilidad, crea un `DataSource`, ejecuta la migración de `usuarios` y ejercita `TypeOrmUserRepository` con casos feliz y borde.
- El test destruye primero el `DataSource` y luego el contenedor en `afterAll`/`finally`. Testcontainers conserva la responsabilidad sobre sus recursos; el workflow no ejecuta `docker system prune` ni elimina recursos ajenos.
- No se declara PostgreSQL en GitHub Actions `services:`. La URL se construye dentro del test con host y puerto asignados por Testcontainers y nunca se guarda como secret.
- La suite depende de `npm ci` y Docker daemon, no de `npm run build` ni de la imagen de la aplicación.

### SonarQube Cloud

- Antes de implementar o ejecutar el scan se deben completar estas precondiciones externas: importar y vincular el proyecto real, verificar `sonar.organization`, `sonar.projectKey` y región desde el onboarding, confirmar que la suscripción admite `dev` y sus Pull Requests, desactivar Automatic Analysis, autorizar la GitHub App y crear `SONAR_TOKEN` como GitHub Repository Secret con el menor alcance de `Execute Analysis` disponible. Solo se documentan la presencia y configuración no secreta; el valor del token no se registra ni versiona.
- Se usa análisis basado en CI y la integración oficial `SonarSource/sonarqube-scan-action@v8`, major vigente al 2026-09-13. Automatic Analysis debe quedar desactivado para evitar análisis duplicado y permitir importar coverage.
- `backend/sonar-project.properties` define:
  - `sonar.organization` y `sonar.projectKey` con los valores exactos proporcionados por el onboarding del proyecto, nunca inferidos del nombre GitHub;
  - `sonar.sources=src`;
  - `sonar.tests=test`;
  - exclusiones limitadas a outputs generados y `sonar.coverage.exclusions=src/main.ts`, en consonancia con Jest;
  - `sonar.javascript.lcov.reportPaths=coverage/unit/lcov.info,coverage/integration/lcov.info`;
  - `sonar.qualitygate.wait=true` y `sonar.qualitygate.timeout=300`;
  - encoding UTF-8.
- El workflow establece `projectBaseDir: backend`, restaura únicamente los LCOV efectivamente disponibles, entrega `SONAR_TOKEN` únicamente desde GitHub Secrets y no lo escribe en archivos, argumentos ni logs. Para Team/Enterprise se prefiere un Scoped Organization Token limitado al proyecto y `Execute Analysis`; para Free/OSS, un token con el mínimo alcance disponible.
- El proyecto Sonar debe importarse y vincularse al repositorio `diazme1/desapp-2s-grupo-i`, con la GitHub App autorizada, para que el Quality Gate y el detalle aparezcan en la Pull Request.
- Analizar pushes a `dev` y Pull Requests hacia `dev` requiere que la organización use Team, Enterprise u OSS; el plan Free común no satisface este alcance. Esta compatibilidad es una precondición antes de habilitar el check obligatorio.
- La región se toma del proyecto Sonar: la región europea estándar no necesita host personalizado; para una organización estadounidense se define el parámetro de región recomendado, sin inventar URLs.
- El análisis Sonar obligatorio de esta feature se limita a Pull Requests originadas en ramas del mismo repositorio. Los forks no reciben `SONAR_TOKEN`: el workflow mantiene sus validaciones sin secretos cuando sea posible, omite solo los steps del scanner y no usa `pull_request_target` ni un workflow privilegiado. Incorporar análisis Sonar seguro para forks queda fuera de alcance.

### Docker build, startup y health

- La imagen se construye localmente con `backend/Dockerfile`, contexto `backend` y una etiqueta exclusiva de la ejecución; nunca se autentica contra un registry ni se publica.
- Se conserva el Dockerfile actual en esta feature: la compilación ya es un gate independiente y el objetivo Docker es validar exactamente el artefacto hoy mantenido por el proyecto. Una migración a imagen multi-stage/productiva alteraría el flujo de desarrollo de Compose y queda fuera de alcance.
- El contenedor publica el puerto 3000 y recibe `NODE_ENV=production`, `PORT=3000`, `JWT_EXPIRES_IN=15m`, `JWT_ALGORITHM=HS256` y un `JWT_SECRET` sintético de al menos 32 caracteres. No recibe `DATABASE_URL`, por lo que el startup usa el repositorio en memoria y no depende de PostgreSQL ni de servicios productivos.
- Un bucle acotado consulta `http://127.0.0.1:3000/health`, exige HTTP 200 y revisa en cada intento que el contenedor siga corriendo. El límite total es 60 segundos y cada request tiene timeout corto.
- Ante falla se muestran `docker ps -a`, `docker inspect` y `docker logs` antes de eliminar recursos. Un step con condición de falla conserva diagnóstico y otro con condición `always()` elimina solo el contenedor y la imagen nombrados por el job.

### Clasificación de variables

| Variable | Clasificación para CI | Decisión |
| --- | --- | --- |
| `PORT` | Valor seguro | `3000` en el contenedor smoke. |
| `NODE_ENV` | Valor seguro | `production` para ejercer la validación no-test. |
| `JWT_EXPIRES_IN` | Valor seguro | `15m`, valor ya documentado. |
| `JWT_ALGORITHM` | Valor seguro | `HS256`, valor ya permitido/documentado. |
| `JWT_SECRET` | Reemplazo local de testing | Literal sintético, sin valor fuera del runner y con longitud válida; nunca usar credencial productiva. |
| `DATABASE_URL` | Reemplazo administrado por tests | Se omite en smoke; Testcontainers construye una URL efímera dentro de la suite de persistencia. |
| `SONAR_TOKEN` | GitHub Repository Secret | Token mínimo para `Execute Analysis`; se configura antes del scan, es el único secreto nuevo requerido y nunca se registra ni versiona. |
| Organización, project key y región Sonar | Configuración no secreta | Valores verificados durante onboarding; se versionan donde corresponda sin tokens. |

## Phase 1 Design Review

### Gate posterior al diseño: PASS

- El alcance backend-only es consistente con el estado real del repositorio; no se agregan componentes, dependencias, scaffolding ni tests de frontend inexistentes.
- La separación de jobs y rutas conserva unitarios sin infraestructura y limita Docker/Testcontainers a integración y smoke.
- El descubrimiento dinámico compara rutas de suites con Jest en cada ejecución y no fija cantidades que bloqueen tests nuevos.
- La nueva cobertura de persistencia se agrega como suite nueva; no cambia ningún test protegido.
- El diseño no incorpora end-to-end ni confunde los tests HTTP de integración existentes con un paquete e2e.
- PostgreSQL real es creado por Testcontainers; no existe un segundo PostgreSQL administrado por GitHub Actions.
- Build, suites, Quality Gate, Docker build y health son fallos obligatorios e identificables.
- Sonar se ejecuta en todo push incluido y Pull Request aplicable aunque falte coverage; los LCOV se consumen solo cuando existen y su ausencia aislada no agrega un gate.
- Las Pull Requests desde forks conservan checks sin secretos, no ejecutan Sonar y no amplían privilegios mediante `pull_request_target`.
- Startup, logs y limpieza tienen condiciones finitas y recuperables.
- No se usan servicios, imágenes ni credenciales de producción, y no se publican artefactos Docker.
- No se modifican endpoints ni contratos del producto; por lo tanto no corresponden cambios en Postman/OpenAPI.

No quedan `NEEDS CLARIFICATION` ni violaciones constitucionales. Los identificadores, región, suscripción, vinculación y Repository Secret de Sonar son precondiciones externas que deben verificarse antes de implementar y ejecutar el scan.
