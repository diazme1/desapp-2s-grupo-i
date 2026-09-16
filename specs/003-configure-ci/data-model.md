# Modelo de datos operativos: Integración continua

Esta feature no agrega entidades ni persistencia al dominio de Football Player Market. Los siguientes objetos describen el estado observable del pipeline y sirven para diseñar jobs, artefactos y validaciones.

## Ejecución de CI

Representa una evaluación completa de una revisión del repositorio.

### Atributos

- `evento`: push o Pull Request.
- `ramaDestino`: `main` o `dev`.
- `revision`: identificador inmutable del commit evaluado.
- `pullRequest`: número de propuesta cuando corresponda.
- `estado`: `pending`, `running`, `passed`, `failed` o `cancelled`.
- `resultados`: colección de resultados obligatorios.

### Reglas

- Una ejecución solo puede quedar `passed` cuando todos los resultados obligatorios están `passed`.
- Un resultado `failed`, ausente u omitido impide presentar la ejecución como válida para integración.
- Los artefactos y recursos de una ejecución no se reutilizan como si pertenecieran a otra revisión.

## Resultado de validación

Representa un check identificable en GitHub.

### Atributos

- `categoria`: `build-unit`, `integration`, `sonar` o `docker-smoke`.
- `revision`: commit al que corresponde.
- `estado`: `pending`, `running`, `passed`, `failed` o `cancelled`.
- `evidencia`: logs, reporte o enlace diagnóstico.
- `inicio` y `fin`: timestamps de ejecución.

### Reglas

- Cada categoría es obligatoria para las ramas y Pull Requests incluidas.
- El nombre y la evidencia deben permitir distinguir la categoría que falló.
- Un resultado no puede cambiar a `passed` si su validación interna no se ejecutó.

## Reporte de coverage

Artefacto efímero producido por una suite Jest y consumido por Sonar.

### Atributos

- `suite`: `unit` o `integration`.
- `formato`: LCOV.
- `ruta`: `backend/coverage/unit/lcov.info` o `backend/coverage/integration/lcov.info`.
- `revision`: commit que produjo el reporte.
- `disponibilidad`: `generated`, `uploaded`, `downloaded` o `missing`.

### Reglas

- Ambos reportes deben pertenecer a la misma revisión analizada.
- Sonar se ejecuta después de que ambos reportes fueron producidos satisfactoriamente.
- Las rutas `SF:src/...` se resuelven con `backend` como project base directory.
- Los reportes son artefactos temporales del CI y no se versionan.

## Análisis Sonar

Representa el análisis de calidad y seguridad de una revisión.

### Atributos

- `organizacion` y `projectKey`: identificadores verificados durante onboarding.
- `revision`: commit analizado.
- `contexto`: rama o Pull Request detectada por la integración.
- `coverage`: referencias a los reportes LCOV.
- `qualityGate`: resultado asociado.
- `detalle`: enlace publicado por SonarQube Cloud.

### Reglas

- Debe usar CI-based analysis, no Automatic Analysis simultáneo.
- Debe quedar asociado a la revisión y, para Pull Requests, visible en la propuesta.
- No puede contener ni exponer `SONAR_TOKEN`.

## Resultado de Quality Gate

### Atributos

- `estado`: `pending`, `passed`, `failed` o `timeout`.
- `timeoutSegundos`: 300.
- `detalle`: referencia al análisis que fundamenta el resultado.

### Transiciones

```text
pending -> passed
pending -> failed
pending -> timeout
```

### Reglas

- Solo `passed` permite que el job `sonar` apruebe.
- `failed` y `timeout` producen salida no cero y bloquean la integración.

## PostgreSQL de prueba

Dependencia efímera creada por la nueva suite de integración.

### Atributos

- `imagen`: `postgres:16-alpine`.
- `credenciales`: valores sintéticos definidos dentro del test.
- `host` y `puerto`: valores asignados dinámicamente por Testcontainers.
- `estado`: `created`, `ready`, `stopped`.

### Transiciones

```text
created -> ready -> stopped
created -> stopped
```

### Reglas

- No depende de GitHub Actions `services:` ni de una base externa.
- La migración de `usuarios` debe ejecutarse antes de probar el Repository.
- El `DataSource` se destruye antes de detener el contenedor.
- Una falla de creación, conexión, migración o cleanup hace fallar la suite.

## Imagen Docker local

### Atributos

- `tag`: etiqueta única para la revisión y ejecución.
- `dockerfile`: `backend/Dockerfile`.
- `contexto`: `backend`.
- `revision`: commit fuente.
- `estado`: `building`, `built`, `failed` o `removed`.

### Reglas

- Solo una imagen `built` puede iniciar el contenedor smoke.
- La imagen no se publica ni autentica contra registries.
- Debe eliminarse al finalizar el job, incluso tras una falla.

## Contenedor de aplicación

### Atributos

- `nombre`: identificador único dentro del job.
- `imageTag`: imagen local construida por esa misma ejecución.
- `puerto`: 3000.
- `variables`: configuración CI no productiva.
- `estado`: `created`, `running`, `exited` o `removed`.
- `logs`: salida recuperable antes del cleanup.

### Transiciones

```text
created -> running -> removed
created -> exited -> removed
running -> exited -> removed
```

### Reglas

- Recibe `DATABASE_URL` apuntando al PostgreSQL aislado del job y ejecuta las migraciones antes de arrancar.
- Un estado `exited` antes de aprobar health es falla.
- El cleanup solo apunta al nombre explícito de esta ejecución.

## Verificación de health

### Atributos

- `url`: `http://127.0.0.1:3000/health`.
- `estadoEsperado`: HTTP 200.
- `respuestaEsperada`: objeto con `status: "ok"`.
- `timeoutTotalSegundos`: 60.
- `estado`: `waiting`, `passed`, `failed` o `timeout`.

### Reglas

- Los reintentos terminan al aprobar, detectar que el contenedor salió o vencer el timeout.
- `failed` o `timeout` activa diagnóstico antes del cleanup.
