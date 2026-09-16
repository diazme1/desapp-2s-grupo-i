# Investigación: Integración continua del proyecto

**Fecha**: 2026-09-13

## Alcance real del repositorio

**Decision**: Planificar el CI para el único package implementado, `backend`, y dejar el frontend fuera hasta que exista código, `package.json` y lockfile verificables.

**Rationale**: Solo existen `backend/package.json` y `backend/package-lock.json`. README y Constitución declaran React/TypeScript para frontend, pero no hay directorio ni comandos que puedan ejecutarse sin inventarlos.

**Alternatives considered**: Crear pasos placeholder o asumir comandos de React. Se rechaza porque el requerimiento exige usar las versiones y scripts actuales.

## Runtime, package manager e instalación

**Decision**: Usar Node.js 22.11.0/22.11.x, npm 10 o superior y `npm ci` con working directory `backend`.

**Rationale**: `backend/package.json` declara Node 22.11.x y npm >=10; el lockfile v3 es el único lockfile y README documenta Node 22.11.0 y `npm ci`.

**Alternatives considered**: Node latest, `npm install`, Yarn o pnpm. Se rechazan porque contradicen el manifiesto o no tienen lockfile.

## Scripts y suites existentes

**Decision**: Reutilizar `npm run build`, `npm run test:unit` y `npm run test:integration`. No ejecutar un paquete e2e inexistente.

**Rationale**: `backend/package.json` mapea esos scripts a Nest build y selectores Jest para `test/unit` y `test/integration`. Hay 9 archivos unitarios y 4 de integración; no hay directorio, configuración ni script e2e.

**Alternatives considered**: Usar `npm test` como único paso o mover tests. Se rechaza porque oculta la categoría que falló y viola la separación solicitada.

## Coverage y LCOV

**Decision**: Agregar opciones de coverage a los dos scripts de suite existentes, escribir `coverage/unit/lcov.info` y `coverage/integration/lcov.info`, y entregar ambos a Sonar con `sonar.javascript.lcov.reportPaths`.

**Rationale**: Coverage no se genera por defecto. `npm run test:cov` sí lo genera en `backend/coverage/lcov.info`, pero vuelve a ejecutar unitarios e integración. Jest permite producir LCOV en directorios separados durante la ejecución ya requerida, evitando duplicación. Los registros LCOV contienen rutas `SF:src/...`, por lo que el scanner debe usar `backend` como base.

**Alternatives considered**: Ejecutar `npm run test:cov` después de ambas suites, que duplica trabajo; escribir dos veces en `coverage/`, que sobrescribe el primer reporte; fusionar reportes con una dependencia nueva, innecesaria porque Sonar acepta múltiples rutas.

**Official reference**: [JavaScript/TypeScript test coverage](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/test-coverage/javascript-typescript-test-coverage).

## Estado actual de Testcontainers y persistencia

**Decision**: Ejecutar las suites de integración contra `postgres:16-alpine` mediante `GenericContainer`, aplicar la migración existente y verificar la persistencia a través de `TypeOrmUserRepository`. No agregar PostgreSQL como `services:`.

**Rationale**: `testcontainers` 11.5.1 ya está en package y lockfile. Las integraciones requieren una URL PostgreSQL real para demostrar acceso a la base y evitar sustitutos simplificados. `GenericContainer` evita incorporar otro package y PostgreSQL 16 coincide con Compose.

**Alternatives considered**: Considerar cumplido el requisito solo con `docker info`, insuficiente para demostrar persistencia; agregar `services: postgres`, que duplica responsabilidad; agregar `@testcontainers/postgresql`, innecesario con la dependencia actual.

## Dependencias y paralelismo

**Decision**: Ejecutar `build-unit`, `integration` y `docker-smoke` en paralelo. Ejecutar `sonar` solo después de `build-unit` e `integration` para consumir ambos LCOV.

**Rationale**: Los tests cargan TypeScript mediante ts-jest y no usan la imagen Docker de la aplicación. El nuevo Testcontainer solo provee PostgreSQL. El Dockerfile construye su propio entorno. Sonar sí depende de reportes generados.

**Alternatives considered**: Cadena totalmente secuencial, que aumenta duración sin dependencia real; Docker antes de integración, innecesario; un único job, que reduce claridad diagnóstica.

## Integración oficial de SonarQube Cloud

**Decision**: Usar CI-based analysis con `SonarSource/sonarqube-scan-action@v8`, desactivar Automatic Analysis y guardar `SONAR_TOKEN` como GitHub Secret.

**Rationale**: La guía oficial indica SonarQube Scan GitHub Action; el major 8 es vigente y valida el scanner con GPG. Automatic Analysis no permite el mismo flujo de coverage y no debe duplicar el análisis basado en CI.

**Alternatives considered**: Scanner instalado manualmente, que agrega mantenimiento; Automatic Analysis, que no satisface coverage; una action comunitaria, que no es la integración oficial solicitada.

**Official references**:

- [GitHub Actions for SonarQube Cloud](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/github-actions-for-sonarcloud)
- [SonarQube Scan Action v8.2.1](https://github.com/SonarSource/sonarqube-scan-action/releases/tag/v8.2.1)

## Ubicación y alcance de Sonar

**Decision**: Crear `backend/sonar-project.properties` y ejecutar el scanner con `projectBaseDir: backend`; definir `sonar.sources=src`, `sonar.tests=test`, los dos LCOV y exclusiones mínimas de outputs y `src/main.ts` para coverage.

**Rationale**: Actualmente hay un único proyecto analizable. La base `backend` coincide con scripts, estructura y rutas `SF:src/...` de LCOV. Fuentes y tests quedan disjuntos. Los identificadores de organización/proyecto deben copiarse del onboarding real, no inferirse del remote Git.

**Alternatives considered**: Propiedades en raíz con `backend/src`, que no coincide naturalmente con el contenido LCOV; dos proyectos Sonar, injustificado sin frontend; parámetros dispersos en YAML, menos mantenibles.

**Official reference**: [Setting initial analysis scope](https://docs.sonarsource.com/sonarqube-cloud/managing-your-projects/project-analysis/setting-analysis-scope/setting-initial-scope).

## Quality Gate obligatorio

**Decision**: Configurar `sonar.qualitygate.wait=true` y `sonar.qualitygate.timeout=300`; no usar una segunda Quality Gate Action.

**Rationale**: La guía Cloud recomienda que el scanner espere el resultado y salga con código no cero cuando el gate falla. Un timeout explícito evita una espera indefinida. El job `sonar` se convierte directamente en check bloqueante.

**Alternatives considered**: `sonarqube-quality-gate-action`, útil principalmente en otros productos/flujos pero redundante aquí; consultar la API con scripts propios, innecesario e inseguro.

**Official references**:

- [Failing workflow on Quality Gate failure](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/github-actions-for-sonarcloud#failing-workflow-on-quality-gate-failure)
- [Quality Gate analysis parameters](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/analysis-parameters/parameters-not-settable-in-ui#quality-gate)

## Ramas, Pull Requests y visibilidad en GitHub

**Decision**: Importar/vincular el proyecto desde GitHub, autorizar la GitHub App de SonarQube Cloud, permitir autodetección de ramas/PR y requerir sus checks en las reglas de `main` y `dev`.

**Rationale**: La integración soportada publica Quality Gate, resumen y detalle en la Pull Request. El checkout completo mejora SCM blame y cálculo de código nuevo; no se fijan parámetros manuales de rama o PR en el flujo integrado.

**Alternatives considered**: Solo enlazar al dashboard Sonar, que no satisface visibilidad en GitHub; pasar manualmente `sonar.pullrequest.*`, que duplica metadata disponible en Actions.

**External gate**: Pushes a `dev` y PRs hacia `dev` necesitan Team, Enterprise u OSS; el plan Free común solo cubre la rama principal y PRs hacia ella. La suscripción compatible debe confirmarse antes de activar el check requerido.

**Fork policy**: El plan inicial cubre ramas del mismo repositorio. GitHub no entrega `SONAR_TOKEN` a PRs desde forks. Si se habilitan, deberá implementarse el patrón oficial de workflows separados que nunca ejecuta código no confiable con secrets.

**Official references**:

- [Branch analysis](https://docs.sonarsource.com/sonarqube-cloud/enriching/branch-analysis)
- [Subscription plans](https://docs.sonarsource.com/sonarqube-cloud/administering-sonarcloud/managing-subscription/subscription-plans)
- [Pull request analysis](https://docs.sonarsource.com/sonarqube-cloud/improving/pull-request-analysis)

## Dockerfile, contexto e imagen

**Decision**: Construir una imagen local desde `backend/Dockerfile` con contexto `backend`, mantener el Dockerfile actual y no usar Compose para el smoke.

**Rationale**: Compose ya confirma `./backend` como contexto y `backend/.dockerignore` excluye dependencias, dist, coverage, `.env` y logs. El Dockerfile usa Node 22.11 Alpine, expone 3000 y arranca con el script existente `start:dev`. El build Nest separado prueba compilación; el smoke prueba el artefacto Docker mantenido hoy. Cambiar a multi-stage/productivo afectaría el Compose de desarrollo y amplía el alcance.

**Alternatives considered**: Contexto raíz, que no coincide con los `COPY package*.json`; Docker Compose, que levanta PostgreSQL adicional; publicar la imagen, explícitamente fuera de alcance; rediseñar el Dockerfile, no necesario para estos criterios.

## Startup, health, diagnóstico y cleanup

**Decision**: Ejecutar PostgreSQL y la imagen en una red aislada, aplicar las migraciones, arrancar la imagen con `DATABASE_URL`, esperar hasta 60 segundos por HTTP 200 de `GET /health`, inspeccionar que el proceso siga activo, mostrar estado/inspect/logs ante falla y eliminar únicamente los recursos nombrados.

**Rationale**: `PORT` tiene default 3000 y `/health` devuelve `{status: "ok"}`. Como `DATABASE_URL` es obligatoria, el smoke prepara PostgreSQL y ejecuta las migraciones antes de verificar el servidor. El cleanup específico evita afectar recursos de otros jobs o del runner.

**Alternatives considered**: Sleep fijo, frágil; espera ilimitada, prohibida; DB productiva, innecesaria; prune global, destructivo y difícil de diagnosticar.

## Variables y secretos

**Decision**: Declarar directamente `PORT=3000`, `NODE_ENV=production`, `JWT_EXPIRES_IN=15m` y `JWT_ALGORITHM=HS256`; usar un `JWT_SECRET` sintético de CI; omitir `DATABASE_URL` en smoke; reservar GitHub Secrets únicamente para `SONAR_TOKEN`.

**Rationale**: La validación exige `JWT_SECRET` de 32 caracteres fuera de test, pero un valor descartable no es una credencial. La URL de PostgreSQL la genera Testcontainers. Ningún secreto productivo es necesario.

**Alternatives considered**: Reutilizar secretos de producción, inseguro; guardar la URL efímera o el token en archivos, innecesario; tratar todos los valores como secrets, que oculta configuración no sensible sin beneficio.

## Cache

**Decision**: No agregar cache explícita en la primera implementación.

**Rationale**: `npm ci` y el lockfile garantizan reproducibilidad. Separar jobs ya prioriza diagnóstico; la medición real debe preceder cualquier optimización.

**Alternatives considered**: Cache manual de `node_modules`, incompatible con instalación limpia; caches de npm/Sonar desde el inicio, posibles pero no necesarios para cumplir la feature.

## Evidencia y limitaciones de la investigación local

**Decision**: Registrar la inspección como evidencia de diseño, no como validación exitosa de la futura implementación.

**Rationale**: Los comandos locales ejecutados sin `npm ci` detectaron un `node_modules` incompleto y fallaron por dependencias que sí constan en el lockfile. El host de planificación no tiene el comando Docker. El CI debe comenzar con instalación limpia y la verificación final debe ejecutarse en GitHub Actions con Docker disponible.

**Alternatives considered**: Presentar esos fallos como defectos de código o afirmar Docker validado localmente. Ambas conclusiones carecen de evidencia.
