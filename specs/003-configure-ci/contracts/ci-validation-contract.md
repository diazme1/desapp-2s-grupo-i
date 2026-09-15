# Contrato de validación del CI

## Matriz de eventos

| Evento | Rama base/destino | Debe ejecutar CI | Debe ejecutar Sonar |
| --- | --- | --- | --- |
| `push` | `main` | Sí | Sí |
| `push` | `dev` | Sí | Sí |
| `pull_request` del mismo repositorio | `main` | Sí | Sí |
| `pull_request` del mismo repositorio | `dev` | Sí | Sí |
| `pull_request` desde fork | `main` o `dev` | Sí, para checks sin secretos | No aplica en esta feature |
| `push` o `pull_request` | Otra rama base | No por esta feature | No por esta feature |

## Checks obligatorios

| Check | Entrada | Resultado aprobado | Condición de falla |
| --- | --- | --- | --- |
| `build-unit` | Revisión y lockfile backend | Instalación reproducible, build exitoso y unitarios aprobados | Falla instalación, compilación o suite |
| `integration` | Revisión, lockfile y Docker daemon | Integraciones aprobadas, incluido PostgreSQL real mediante Testcontainers | Docker inaccesible, PostgreSQL/Testcontainers falla o suite falla |
| `sonar` | Revisión y cada LCOV disponible | Análisis completado y Quality Gate aprobado; en forks queda visible como no aplicable | Scan falla, gate falla o expira su timeout en un evento aplicable |
| `docker-smoke` | Revisión y Dockerfile backend | Imagen local construida, contenedor activo y `GET /health` devuelve HTTP 200 | Build Docker falla, proceso termina, health falla o vence el timeout |

La ejecución global no es válida si cualquiera de estos checks falla, queda omitido o no produce el resultado esperado.

## Contrato de artefactos de coverage

| Productor | Nombre lógico | Ruta al descargar para Sonar | Formato |
| --- | --- | --- | --- |
| `build-unit` | coverage unitario | `backend/coverage/unit/lcov.info` | LCOV |
| `integration` | coverage de integración | `backend/coverage/integration/lcov.info` | LCOV |

- Ambos artefactos deben corresponder al mismo commit que analiza Sonar.
- No contienen secrets ni dependencias instaladas.
- Cada reporte se publica y consume cuando existe. La ausencia de uno o ambos LCOV se informa, pero no omite Sonar ni constituye un gate independiente.
- El scanner usa `backend` como base y consume `coverage/unit/lcov.info,coverage/integration/lcov.info`.

## Contrato de SonarQube Cloud

### Configuración versionada

- Project base directory: `backend`.
- Fuentes: `src`.
- Tests: `test`.
- Coverage JS/TS: ambos LCOV declarados arriba.
- Quality Gate wait: obligatorio.
- Quality Gate timeout: 300 segundos.
- Organization y project key: valores exactos del proyecto Sonar importado.

### Configuración protegida y externa

- `SONAR_TOKEN` existe únicamente como GitHub Secret y permite `Execute Analysis` sobre el proyecto.
- Automatic Analysis está desactivado.
- La GitHub App de SonarQube Cloud tiene acceso al repositorio y publica el análisis en el commit/PR.
- La suscripción habilita análisis de `dev` y PRs hacia `dev`.
- Las reglas de `main` y `dev` requieren el job `sonar`; la GitHub App publica decoración adicional en las revisiones donde el scan aplica.

### Resultado observable

- Un Quality Gate aprobado produce check exitoso y enlace al detalle.
- Un Quality Gate fallido o no resuelto produce job fallido.
- Una Pull Request muestra el estado y detalle del análisis dentro de GitHub.
- En una Pull Request desde fork, sólo se omiten los steps del scanner y ningún step accede a `SONAR_TOKEN`; los demás checks continúan.

## Contrato del test de persistencia

- La suite pertenece a `backend/test/integration` y es descubierta por `npm run test:integration`.
- Usa `GenericContainer` desde la dependencia existente `testcontainers`.
- Usa la imagen `postgres:16-alpine` y credenciales efímeras.
- Construye la conexión desde el host y puerto asignados por Testcontainers.
- Ejecuta la migración de `usuarios` antes de probar `TypeOrmUserRepository`.
- Verifica al menos creación y lectura normalizada, más un caso borde de unicidad o búsqueda inexistente.
- Destruye el `DataSource` y detiene el contenedor aun si una aserción falla.
- No requiere la imagen Docker de la aplicación ni un `services.postgres`.

## Contrato del Docker smoke

### Build

- Dockerfile: `backend/Dockerfile`.
- Contexto: `backend`.
- Tag: local y único por ejecución.
- Push a registry: prohibido.

### Runtime

| Variable | Valor CI |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | Valor sintético CI de al menos 32 caracteres |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_ALGORITHM` | `HS256` |
| `DATABASE_URL` | Ausente |

### Health y diagnóstico

- Endpoint existente: `GET http://127.0.0.1:3000/health`.
- Resultado requerido: HTTP 200; el cuerpo esperado contiene `{"status":"ok"}`.
- Timeout total: 60 segundos con reintentos acotados.
- Cada reintento comprueba que el contenedor no haya terminado.
- Ante falla se muestran listado, inspección y logs del contenedor antes de borrarlo.
- El cleanup siempre elimina únicamente el contenedor y la imagen creados por el job.

El contrato HTTP reutiliza la definición existente de [app base](../../001-app-base/contracts/openapi.yaml); esta feature no modifica endpoints.
