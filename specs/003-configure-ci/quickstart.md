# Quickstart de validación: Integración continua

Esta guía describe cómo comprobar la implementación. No reemplaza los checks remotos de GitHub ni autoriza modificar tests existentes.

## Prerrequisitos

- Node.js 22.11.0/22.11.x.
- npm 10 o superior.
- Docker daemon disponible para integración y smoke.
- Proyecto SonarQube Cloud importado desde `diazme1/desapp-2s-grupo-i`.
- Suscripción Sonar Team, Enterprise u OSS para analizar `dev` y Pull Requests hacia `dev`.
- Automatic Analysis desactivado.
- GitHub Secret `SONAR_TOKEN` con el menor alcance de `Execute Analysis` posible.
- GitHub App de SonarQube Cloud autorizada para decorar Pull Requests.
- `sonar.organization`, `sonar.projectKey` y región copiados del onboarding real.

## 1. Instalación y build local

Desde `backend`:

```bash
npm ci
npm run build
```

Resultado esperado: la instalación respeta `package-lock.json` y el build finaliza con código 0.

## 2. Unitarios sin infraestructura y coverage

```bash
npm run test:unit -- --coverage --coverageDirectory=coverage/unit
if test -f coverage/unit/lcov.info; then echo "LCOV unitario disponible"; else echo "LCOV unitario ausente"; fi
```

Resultado esperado: se ejecutan todas las suites descubiertas bajo `test/unit`, no se inicia Docker ni PostgreSQL y, cuando Jest lo genera, queda disponible `coverage/unit/lcov.info`.

## 3. Integración con PostgreSQL administrado por Testcontainers

Con Docker disponible:

```bash
docker info
npm run test:integration -- --coverage --coverageDirectory=coverage/integration
if test -f coverage/integration/lcov.info; then echo "LCOV de integración disponible"; else echo "LCOV de integración ausente"; fi
```

Resultado esperado:

- se ejecutan todas las suites descubiertas bajo `test/integration`, incluida la nueva suite de persistencia;
- la nueva suite inicia `postgres:16-alpine` mediante Testcontainers, ejecuta la migración y prueba `TypeOrmUserRepository`;
- ningún PostgreSQL se inicia manualmente con Compose o GitHub Actions `services:`;
- la imagen Docker de la aplicación no es requisito de esta suite;
- el `DataSource` y el contenedor PostgreSQL se liberan al finalizar;
- cuando Jest lo genera, queda disponible `coverage/integration/lcov.info`.

## 4. Verificación de configuración Sonar

Desde la raíz del repositorio, comprobar que `backend/sonar-project.properties` contiene:

- organization y project key obtenidos de SonarQube Cloud;
- `sonar.sources=src` y `sonar.tests=test`;
- ambos LCOV en `sonar.javascript.lcov.reportPaths`;
- `sonar.qualitygate.wait=true`;
- timeout 300 segundos;
- exclusiones limitadas a artefactos generados y la exclusión de coverage ya aplicada a `src/main.ts` por Jest.

No ejecutar ni registrar el token en la terminal compartida. El análisis completo se valida en GitHub Actions, donde `SONAR_TOKEN` se inyecta como secret.

Resultado esperado en remoto: el scanner consume cada LCOV disponible, se ejecuta aunque falte uno o ambos reportes, espera el Quality Gate y GitHub muestra el resultado en el commit y en la Pull Request aplicable.

## 5. Docker build y startup local

Desde la raíz:

```bash
docker build --file backend/Dockerfile --tag desapp-backend-ci:local backend
docker run --detach --name desapp-backend-ci --publish 3000:3000 --env NODE_ENV=production --env PORT=3000 --env JWT_SECRET=ci-only-jwt-secret-not-for-production-123456 --env JWT_EXPIRES_IN=15m --env JWT_ALGORITHM=HS256 desapp-backend-ci:local
docker ps --filter name=desapp-backend-ci
curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3000/health
```

Resultado esperado: PostgreSQL y el contenedor de la aplicación permanecen activos y health devuelve HTTP 200 con `{"status":"ok"}`. El smoke define `DATABASE_URL` apuntando al PostgreSQL aislado del job.

Ante un startup fallido, obtener evidencia antes del cleanup:

```bash
docker ps --all --filter name=desapp-backend-ci
docker inspect desapp-backend-ci
docker logs desapp-backend-ci
```

Limpiar únicamente los recursos creados por esta verificación:

```bash
docker rm --force desapp-backend-ci
docker image rm desapp-backend-ci:local
```

El workflow implementará reintentos equivalentes bajo un límite total de 60 segundos y ejecutará diagnóstico antes de cleanup.

## 6. Matriz remota de eventos

Verificar en GitHub que cada fila inicia los cuatro jobs del [contrato del CI](./contracts/ci-validation-contract.md):

| Prueba | Resultado esperado |
| --- | --- |
| Push a `main` | Inicia CI y Sonar para `main`. |
| Push a `dev` | Inicia CI y branch analysis para `dev`. |
| Abrir/reabrir/sincronizar/editar PR del mismo repositorio hacia `main` | Inicia CI, analiza el cambio y decora la PR. |
| Abrir/reabrir/sincronizar/editar PR del mismo repositorio hacia `dev` | Inicia CI, analiza el cambio y decora la PR. |
| PR desde fork hacia `main` o `dev` | Ejecuta checks sin secretos; `sonar` informa que el scan no aplica y no accede al token. |
| Evento fuera de esas ramas | No es requerido por esta feature. |

## 7. Quality Gate y reglas de integración

Después de la primera ejecución:

1. Confirmar que el check de Sonar y su enlace aparecen en GitHub.
2. Configurar las reglas de `main` y `dev` para exigir `build-unit`, `integration`, `sonar` y `docker-smoke`. La GitHub App agrega la decoración Sonar en las Pull Requests aplicables sin convertirla en requisito para forks fuera del alcance del scan.
3. Usar una rama temporal con una infracción controlada de código nuevo para comprobar que el Quality Gate falla.
4. Confirmar que el job `sonar` queda fallido y que la Pull Request no puede considerarse válida para integración.
5. Descartar la rama de prueba; no modificar, deshabilitar ni saltear tests para provocar la falla.

## 8. Casos negativos obligatorios

Ejecutar pruebas controladas en ramas descartables, sin alterar tests existentes:

| Categoría | Comprobación | Evidencia esperada |
| --- | --- | --- |
| Instalación/build | Introducir un error de compilación temporal en código fuente | `build-unit` falla y señala build. |
| Unitarios | Introducir temporalmente una regresión de dominio detectada por un test existente | `build-unit` falla en el step unitario. |
| Integración | Introducir temporalmente una regresión detectada por integración | `integration` falla sin omitir suites. |
| Testcontainers | Ejecutar la suite en el runner con Docker y confirmar el ciclo PostgreSQL | Logs del test y suite exitosa; Docker inaccesible produce falla clara. |
| Sonar | Provocar una condición de código nuevo que no supere el gate | `sonar` y el check de la PR fallan. |
| Docker build | Usar una revisión temporal cuyo Docker build sea inválido | `docker-smoke` falla antes del run. |
| Startup | Ejecutar temporalmente con `JWT_SECRET` inválido | El contenedor termina; inspect/logs aparecen antes del cleanup. |
| Health timeout | Impedir la disponibilidad del endpoint en una prueba controlada | Falla antes de 60 segundos, con logs. |

Una ejecución solo aprueba cuando todas las categorías obligatorias aprueban.

## Limitaciones observadas durante el plan

- El host local usado para planificar no tiene el comando Docker, por lo que Testcontainers y el smoke requieren validación posterior en un runner compatible.
- La validación local usa Node.js 24.6.0, distinto del 22.11.x fijado por el proyecto; el runner configura 22.11.0 explícitamente.
- No existe implementación frontend; no hay comandos que puedan validarse todavía.
- Los Pull Requests desde forks no ejecutan el scanner Sonar en esta feature porque GitHub no entrega `SONAR_TOKEN` al evento normal; no se usa `pull_request_target` ni un workflow privilegiado.

## Evidencia local del 2026-09-14

- `npm ci`: aprobado desde `backend/package-lock.json`; npm informó la diferencia de versión de Node indicada arriba.
- `npm run build`: aprobado.
- `npm run lint`: aprobado, sin warnings ni errores.
- Descubrimiento dinámico: aprobadas las comparaciones de rutas para unitarios e integración, sin conteos fijos.
- Unitarios con coverage: 9 suites y 32 tests aprobados; se generó `coverage/unit/lcov.info`.
- Integración: las 4 suites preexistentes y sus 16 tests aprobaron al permitir sockets locales. La nueva suite fue descubierta y compilada, pero sus 2 casos no pudieron ejecutarse porque el host no tiene runtime Docker; la ejecución completa queda pendiente.
- Startup sin contenedor: el binario generado por `npm run build` levantó con la configuración sintética de CI y `GET /health` respondió HTTP 200 con `{"status":"ok"}`. Esta evidencia no sustituye el smoke de la imagen Docker.
- `npx tsc --noEmit`: detectó 2 errores de tipado en tests preexistentes. No se modificaron porque la Constitución prohíbe alterar tests sin aprobación; `npm run build`, que es el gate definido por el proyecto, sí aprobó.
- Docker build, smoke y Testcontainers: no verificables en este host por ausencia del comando/runtime Docker.
- SonarQube Cloud: no verificable localmente; faltan completar onboarding, identificadores reales, Repository Secret, GitHub App, suscripción/región y ejecución remota.
