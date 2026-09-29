# Implementation Plan: Protección API key para refresh del catálogo

**Branch**: `feat/api-key-admin` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-catalog-refresh-api-key/spec.md`

## Summary

Agregar una segunda credencial obligatoria y exclusiva para `POST /catalog/refresh`, sin
reemplazar el JWT Bearer existente ni alterar los demás endpoints. La request será autorizada
por `JwtAuthGuard` y `CatalogRefreshApiKeyGuard`; este último recibirá el secreto esperado
desde la configuración validada de la aplicación mediante inyección de configuración o un
provider explícito. El guard no leerá directamente `process.env`.

La política única de la API key será generar una cadena base64url desde al menos 32 bytes de
aleatoriedad criptográfica —el procedimiento documentado usará 32 bytes— y validar la
configuración sobre los bytes UTF-8 de la cadena, exigiendo al menos 32 bytes. No se mezclarán
reglas de caracteres, bytes aleatorios y bytes decodificados. La comparación de credenciales
usará buffers de igual longitud y `crypto.timingSafeEqual`; las longitudes distintas se
rechazarán antes de invocarlo.

La configuración rechazará en ambientes no-test los valores ausentes, vacíos, compuestos solo
por espacios, con espacios laterales, menores a 32 bytes UTF-8 o iguales a los placeholders
canónicos `change-me`, `changeme`, `your-api-key`, `your-secret`, `secret` y `test`. Esta
política se implementará en el helper de configuración compartido, pero la detección de
placeholders se aplicará únicamente al secreto configurado, nunca al header recibido.

La feature se cubrirá con tests unitarios, integración strict, regresión de alcance,
verificación de `/docs-json`, contrato estático, Postman, build, lint y quickstart. Ningún
test existente será modificado ni eliminado; el soporte compartido de integración se ampliará
aditivamente para conservar sus fixtures legacy.

## Technical Context

**Language/Version**: Node.js 22.11.x, TypeScript 5.7.3 en modo strict y CommonJS.

**Primary Dependencies**: NestJS 11.4.7, `@nestjs/config`, `@nestjs/jwt`,
`@nestjs/swagger` 11.4.7, TypeORM, PostgreSQL, `class-validator`, `class-transformer`,
Supertest y el módulo nativo `node:crypto`. No se agregan dependencias.

**Storage**: No se agrega persistencia. La configuración vive en variables de entorno y se
expone al runtime mediante la configuración validada de la aplicación. Los tests de integración
existentes continúan usando PostgreSQL/Testcontainers para el catálogo.

**Testing**: Jest 30 con `ts-jest`; unitarios en `backend/test/unit`, integración con
Supertest en `backend/test/integration`, y PostgreSQL real/Testcontainers solo donde ya lo
requieren las suites de catálogo. Los tests existentes se conservan textualmente; el arnés
compartido puede ampliarse de forma aditiva.

**Target Platform**: Backend REST NestJS ejecutado localmente, en Docker Compose y en GitHub
Actions, con Node.js 22.11.x.

**Project Type**: Backend web-service REST.

**Performance Goals**: Rechazar credenciales inválidas antes de invocar el Service de
actualización, la base de datos o la fuente externa. La comparación se realiza en memoria con
un secreto de tamaño acotado y no agrega consultas de red ni persistencia.

**Security Constraints**:

- `POST /catalog/refresh` exige JWT Bearer y `X-API-Key`; los demás endpoints no reciben el
  guard nuevo.
- El secreto esperado se obtiene de `CATALOG_REFRESH_API_KEY`, se valida al bootstrap y se
  inyecta al guard desde la configuración validada o un provider explícito.
- `CatalogRefreshApiKeyGuard` no lee directamente `process.env` ni variables de entorno sin
  pasar por la configuración validada.
- La generación documentada usa `randomBytes(32).toString('base64url')`.
- La validación mínima opera sobre bytes UTF-8 de la cadena configurada y exige al menos 32
  bytes; no se usa una regla alternativa de caracteres o bytes decodificados.
- La comparación usa `crypto.timingSafeEqual` únicamente después de comprobar longitudes
  iguales; no se usa comparación directa de strings.
- No se registran ni exponen secretos, JWT, longitudes, hashes, prefijos o fragmentos en logs,
  errores, respuestas, Swagger/OpenAPI, Postman ni ejemplos de entorno.

**Scale/Scope**: Un secreto compartido por instancia del backend para un único endpoint. No
se implementan múltiples claves, persistencia, expiración, revocación, rotación por API,
roles administrativos ni cambios al JWT.

## Constitution Check

*GATE: PASS before Phase 0 research.*

| Principio | Cumplimiento |
|---|---|
| I. Stack tecnológico | PASS: se mantiene TypeScript/NestJS, PostgreSQL y el módulo nativo de Node.js; no se agregan dependencias. |
| II. Arquitectura en capas | PASS: la autenticación transversal queda en guards; el Controller compone guards y delega al Service existente; no accede a repositories ni adapters. |
| III. Modelo rico | PASS: no se agregan entidades ni reglas de dominio; la API key es configuración de infraestructura. |
| IV. Cada validación en su nivel | PASS: headers y credenciales se validan en guards; configuración en bootstrap; Service y DTOs conservan responsabilidades. |
| V. Tests y protección | PASS: se agregan unitarios e integración, se usa Supertest/Testcontainers cuando corresponde y no se modifican ni eliminan tests existentes. |
| VI. Definición de terminado | PASS: el diseño incluye tests, build, lint, Postman, Swagger/OpenAPI, `.env.example` y quickstart. |
| VII. Idioma | PASS: documentación y errores propios permanecen en español; los términos técnicos normativos se mantienen en inglés. |
| VIII. Operaciones transaccionales | PASS: la feature no altera operaciones financieras ni persistencia. |
| IX. Integraciones externas | PASS: los rechazos ocurren antes del Adapter y no cambian la continuidad de lecturas locales. |
| Protección de tests existentes | PASS: cualquier modificación al arnés es aditiva y no modifica ni elimina specs existentes. |

No hay violaciones constitucionales que requieran justificación.

## Decisiones de diseño

### 1. Política única de secreto, validación y placeholders

`CATALOG_REFRESH_API_KEY` representa la cadena operativa que se coloca en el entorno y en el
header. El procedimiento oficial genera la cadena con `randomBytes(32).toString('base64url')`.
La configuración se considera suficientemente larga si la representación de la cadena en
UTF-8 contiene al menos 32 bytes. La especificación, tests, `.env.example`, quickstart y
documentación deben usar exactamente esta terminología.

La lista canónica de placeholders rechazados en ambientes no-test será:

```text
change-me
changeme
your-api-key
your-secret
secret
test
```

Además se rechazan ausencia, cadena vacía, solo espacios, espacios laterales y valores con
menos de 32 bytes UTF-8. La política de placeholders se centraliza en
`backend/src/auth/catalog-refresh-api-key.ts` y es invocada por la validación de
`backend/src/config/environment.ts`. Nunca se aplica a `X-API-Key`, porque un valor recibido
por HTTP debe validarse solo contra el secreto configurado.

### 2. Helper criptográfico y comparación resistente

`backend/src/auth/catalog-refresh-api-key.ts` será un módulo puro, sin NestJS ni HTTP, con:

- `MIN_CATALOG_REFRESH_API_KEY_BYTES = 32`.
- Generación con `randomBytes(32).toString('base64url')`.
- Conversión de configuración y candidato a `Buffer` UTF-8.
- Rechazo temprano si el candidato no es un único string, está vacío o sus buffers tienen
  longitudes distintas.
- Invocación de `crypto.timingSafeEqual(candidateBuffer, expectedBuffer)` solo cuando las
  longitudes coinciden.
- Ningún `===`, `==`, `localeCompare`, comparación de prefijos o comparación directa de
  secretos para decidir autorización.

El helper expondrá la política necesaria para que configuración, guard y tests compartan las
mismas reglas sin duplicación. No hará logging y no incluirá valores secretos en errores.

### 3. Configuración validada e inyección al guard

`backend/src/config/environment.ts` incorporará `CATALOG_REFRESH_API_KEY` al objeto de
configuración validada. En ambientes no-test, el bootstrap rechazará cualquier valor inseguro
antes de aceptar tráfico. En `NODE_ENV=test` se permitirá una fixture controlada para no
romper suites no relacionadas, pero el endpoint seguirá exigiendo el header en cada request.

`AuthModule` registrará un provider explícito, o utilizará el mecanismo de configuración ya
existente, para entregar al `CatalogRefreshApiKeyGuard` el secreto esperado ya validado. El
guard recibirá ese valor por constructor/inyección y solo leerá `X-API-Key` desde la request.
No accederá directamente a `process.env`, no cargará `.env` y no tendrá un fallback por defecto.
La suite unitaria del guard verificará que su dependencia sea el secreto provisto por la
configuración y que un valor ausente no autorice la request.

### 4. Frontera HTTP y composición con JWT

`CatalogRefreshApiKeyGuard` vivirá en `backend/src/auth/guards/` y se registrará/exportará
desde `backend/src/auth/auth.module.ts`. `PlayersController` aplicará ambos guards únicamente
al método de refresh:

```text
JwtAuthGuard -> CatalogRefreshApiKeyGuard -> ActualizarCatalogoService
```

El `JwtAuthGuard` existente no se modifica. El refresh solo llega al Service cuando ambas
credenciales son válidas. Los demás controllers y endpoints no reciben API key.

### 5. Errores y no filtración verificable

Los rechazos de JWT o API key conservarán HTTP 401 y el mensaje genérico existente. Las
aserciones de integración comprobarán que el body no contenga la API key completa o parcial,
el JWT completo o parcial, la longitud del secreto, hashes, prefijos, fragmentos ni el valor
de `CATALOG_REFRESH_API_KEY`.

Los tests unitarios de configuración comprobarán que los errores solo informan el nombre de la
variable y la regla incumplida, nunca el valor o derivados. Las revisiones de logs, Swagger,
Postman, `.env.example`, README y contrato estático serán adicionales a las aserciones HTTP.
La captura automatizada de logs, trazas y excepciones durante el bootstrap inválido quedará
cubierta por los tests de configuración de US2, y la captura durante rechazos HTTP quedará
cubierta por la integración strict de US1; ambas verificaciones forman parte de sus tareas de
tests correspondientes y no se dejarán para una etapa de auditoría posterior.

### 6. Compatibilidad de tests existentes

No se modificará `backend/test/integration/players/catalog.spec.ts` ni ningún spec existente.
`backend/test/integration/players/players-integration-app.ts` podrá ampliarse aditivamente con:

- modo legacy para que los tests existentes continúen usando su flujo actual con una fixture
  local inyectada;
- modo strict para la suite nueva, sin inyección automática del header;
- restauración de `CATALOG_REFRESH_API_KEY` al cerrar el arnés.

La fixture nunca se imprimirá ni se reutilizará en documentación o artefactos versionados.

### 7. Swagger/OpenAPI y documentación

`configure-app.ts` registrará `catalogRefreshApiKey` como `apiKey` en el header `X-API-Key`.
El refresh usará un único security requirement object con `bearerAuth` y
`catalogRefreshApiKey`, expresando AND. No se modificará la seguridad global ni la metadata de
otras rutas.

El contrato estático y el documento servido en `/docs-json` deberán coincidir y documentar
respuestas 200, 401, 422 y 503 sin valores secretos. Postman usará una variable vacía/no
secreta únicamente para el request de refresh.

## Alternativas consideradas y descartadas

| Alternativa | Decisión | Motivo del descarte |
|---|---|---|
| Comparar la API key en `PlayersController` | Descartada | Mezcla autenticación con transporte y dificulta el test unitario. |
| Validar la API key dentro de `ActualizarCatalogoService` | Descartada | Permite que una request no autenticada alcance el caso de uso y acopla el Service a HTTP. |
| Leer `process.env` desde el guard | Descartada | Evita la configuración validada, dificulta el provider y contradice la frontera definida. |
| Guard global o API key en todos los controllers | Descartada | Alteraría endpoints que no deben exigir API key. |
| Modificar `JwtAuthGuard` | Descartada | Podría cambiar `/auth/me` y otras rutas protegidas. |
| Comparación directa, hash ad-hoc o padding | Descartada | No satisface la política explícita de buffers iguales y `timingSafeEqual`. |
| Placeholder genérico no documentado | Descartada | No permite validar ni probar de forma determinista la configuración insegura. |
| Modificar cada test existente | Descartada | Viola la protección constitucional y FR-016; se usa soporte aditivo. |
| Dos requisitos Swagger separados | Descartada | Pueden representar OR; se requiere un único objeto con ambos esquemas. |

## Project Structure

### Documentation

```text
specs/008-catalog-refresh-api-key/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md                         # existente; no se modifica en este plan
```

### Source, configuration and tests

```text
backend/
├── src/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── catalog-refresh-api-key.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts                         # existente, no modificar
│   │       └── catalog-refresh-api-key.guard.ts
│   ├── config/
│   │   └── environment.ts
│   ├── configure-app.ts
│   └── players/
│       └── players.controller.ts
├── .env.example
└── test/
    ├── unit/
    │   ├── auth/
    │   │   ├── catalog-refresh-api-key.spec.ts
    │   │   ├── catalog-refresh-api-key.guard.spec.ts
    │   │   └── environment-catalog-refresh-api-key.spec.ts
    │   └── documentation/
    │       └── api-key-artifacts.spec.ts
    └── integration/
        ├── auth/
        │   ├── api-key-scope.spec.ts
        │   └── ...                                   # existentes, no modificar
        ├── documentation/
        │   └── swagger-openapi.spec.ts
        └── players/
            ├── catalog-api-key.spec.ts
            ├── catalog.spec.ts                         # existente, no modificar
            └── players-integration-app.ts

docs/postman/players-catalog.postman_collection.json
README.md
backend/README.md
```

El mapa anterior es exhaustivo para los archivos que esta feature crea o modifica y enumera
explícitamente todas las suites y helpers referenciados por `tasks.md`. Los archivos marcados
como existentes no deben modificarse.

## Mapa de archivos

| Ruta | Acción | Propósito |
|---|---|---|
| `backend/src/auth/catalog-refresh-api-key.ts` | Crear | Generación, mínimo de 32 bytes UTF-8, placeholders canónicos y comparación segura. |
| `backend/src/auth/guards/catalog-refresh-api-key.guard.ts` | Crear | Recibir el secreto validado por inyección, leer `X-API-Key` y responder 401 genérico. |
| `backend/src/auth/auth.module.ts` | Modificar | Registrar y exportar el guard/provider sin alterar `JwtAuthGuard`. |
| `backend/src/players/players.controller.ts` | Modificar | Componer ambos guards y metadata AND solo para refresh. |
| `backend/src/config/environment.ts` | Modificar | Validar `CATALOG_REFRESH_API_KEY` y exponer configuración segura. |
| `backend/src/configure-app.ts` | Modificar | Registrar el security scheme API key de Swagger. |
| `backend/test/unit/auth/catalog-refresh-api-key.spec.ts` | Crear | Generación, representación, mínimo, comparación, longitudes y placeholders de configuración. |
| `backend/test/unit/auth/catalog-refresh-api-key.guard.spec.ts` | Crear | Inyección del secreto, header válido/ausente/vacío/espacios/repetido/inválido y 401 genérico. |
| `backend/test/unit/auth/environment-catalog-refresh-api-key.spec.ts` | Crear | Configuración ausente, insegura, placeholders, espacios, válida y errores sin secretos. |
| `backend/test/unit/documentation/api-key-artifacts.spec.ts` | Crear | Postman, `.env.example`, README, contrato y documentos sin valores secretos. |
| `backend/test/integration/players/catalog-api-key.spec.ts` | Crear | JWT/API key válidos e inválidos, no ejecución del refresh y no filtración HTTP. |
| `backend/test/integration/players/players-integration-app.ts` | Modificar aditivamente | Fixture legacy/strict, provider de configuración y restauración de entorno. |
| `backend/test/integration/documentation/swagger-openapi.spec.ts` | Crear | `/docs-json`, schemes, requirement AND y ausencia de secretos. |
| `backend/test/integration/auth/api-key-scope.spec.ts` | Crear | Regresión de endpoints que no deben exigir `X-API-Key`. |
| `backend/test/integration/players/catalog.spec.ts` | No modificar | Suite existente protegida por FR-016 y la constitución. |
| `backend/test/integration/auth/` | No modificar | Suites existentes de autenticación. |
| `backend/.env.example` | Modificar | Variable vacía, política mínima, placeholders y generación segura. |
| `docs/postman/players-catalog.postman_collection.json` | Modificar | Variable no secreta y header solo en refresh. |
| `README.md` | Modificar | Configuración y operación del endpoint. |
| `backend/README.md` | Modificar | Instrucciones específicas del backend. |
| `specs/008-catalog-refresh-api-key/contracts/openapi.yaml` | Modificar | Contrato estático con ambos esquemas y respuestas genéricas. |
| `specs/008-catalog-refresh-api-key/quickstart.md` | Modificar | Validación punta a punta y escenarios verificables. |
| `specs/008-catalog-refresh-api-key/data-model.md` | Modificar | Modelo efímero y configuración inyectada. |
| `specs/008-catalog-refresh-api-key/research.md` | Modificar | Decisiones sobre crypto, configuración, placeholders y tests. |
| `specs/008-catalog-refresh-api-key/tasks.md` | No modificar en esta fase | Se regenerará con `$speckit-tasks` después de aprobar este plan. |

## Secuencia única de implementación

La implementación seguirá este orden, que deberá reflejarse en las dependencias de
`tasks.md`:

### Fase 1 — Helper criptográfico y tests unitarios

1. Definir la política común y escribir los tests del helper.
2. Implementar generación base64url desde 32 bytes, validación mínima sobre bytes UTF-8,
   placeholders de configuración y comparación con `timingSafeEqual`.
3. Verificar explícitamente longitudes distintas antes de invocar `timingSafeEqual`.

No se marca esta fase como paralela: el test-first y la implementación comparten el contrato
del helper.

### Fase 2 — Configuración y tests de bootstrap

1. Escribir los tests de `validateEnvironment` para ausencia, vacío, espacios, espacios
   laterales, menos de 32 bytes UTF-8, placeholders y configuración válida.
2. Incorporar la variable al objeto de configuración validada y preservar el orden de errores
   existente.
3. Verificar que los errores identifican la regla sin filtrar secreto, longitud, hash, prefijo
   o fragmento.

Esta fase también define el provider de configuración que recibirá el guard en la fase 3.

### Fase 3 — Guard y composición con JWT

1. Escribir los unitarios del guard con una configuración inyectada explícitamente.
2. Implementar y registrar/exportar `CatalogRefreshApiKeyGuard`.
3. Aplicar `JwtAuthGuard` y `CatalogRefreshApiKeyGuard` únicamente en `POST /catalog/refresh`.
4. Confirmar que ningún otro endpoint requiere API key y que el guard no lee `process.env`.

### Fase 4 — Integración y regresión

1. Ampliar aditivamente `players-integration-app.ts` con modos legacy/strict y restauración de
   entorno sin tocar specs existentes.
2. Crear la integración strict para JWT válido/API key válida y rechazos con API key ausente,
   vacía, solo espacios, espacios laterales, inválida de igual longitud e inválida de longitud
   distinta.
3. Cubrir JWT ausente, malformado, alterado, vencido y firmado con algoritmo no permitido.
4. En cada rechazo verificar HTTP 401, cero invocaciones al Service/Adapter y body genérico sin
   API key, JWT, longitud, hash, prefijo ni fragmentos.
5. Ejecutar la regresión de endpoints y todos los tests existentes sin editar ni eliminar sus
   archivos.

### Fase 5 — Documentación y validación final

1. Actualizar Swagger/OpenAPI, `/docs-json`, contrato estático, Postman, `.env.example`, README
   y quickstart con la política canónica y la lista de placeholders.
2. Ejecutar las verificaciones de artefactos sin secretos.
3. Ejecutar build, lint, tests unitarios, tests de integración y escenarios del quickstart.
4. Revisar el diff final para confirmar el alcance exclusivo del refresh y la preservación de
   tests existentes.

## Dependencias y oportunidades `[P]`

```text
Baseline de archivos y versiones
            |
Fase 1: helper + unitarios
            |
Fase 2: configuración + unitarios
            |
Fase 3: guard/provider + composición JWT
            |
Fase 4: arnés strict + integración/regresión
            |
Fase 5: documentación + validación final
```

Oportunidades paralelas permitidas después de que la fase correspondiente haya fijado su
contrato:

- La inspección de baseline puede ejecutarse en paralelo con la revisión de constitución.
- Los artefactos de documentación de la fase 5 —contrato estático, Postman, README y
  `.env.example`— pueden trabajarse en paralelo una vez establecida la metadata runtime.
- Las verificaciones finales de build, lint, unitarios e integración pueden ejecutarse en
  paralelo sobre un checkout estable; el quickstart y la revisión de diff quedan después de
  esas verificaciones.

No se deben marcar como `[P]` tareas que compartan el helper, la configuración, el Controller,
el arnés de integración o el mismo artefacto documental. En particular, los tests de
integración dependen de la composición del guard y no deben precederla en el grafo final.

## Estrategia de tests y matriz de aceptación

| Requisito/escenario | Evidencia planificada |
|---|---|
| JWT válido + API key válida | `catalog-api-key.spec.ts`: HTTP 200, resumen vigente y una única invocación de actualización. |
| API key ausente, vacía o solo espacios | Integración strict: HTTP 401, cero invocaciones y body genérico. |
| API key con espacios laterales | Integración strict: HTTP 401 sin trimming ni normalización. |
| API key inválida de igual longitud | Helper + integración: rechazo sin comparación directa y sin filtración. |
| API key inválida de longitud distinta | Helper + integración: rechazo sin llamar `timingSafeEqual` ni producir excepción. |
| JWT ausente | Integración strict: HTTP 401 y cero invocaciones. |
| JWT malformado | Integración strict: HTTP 401 y cero invocaciones. |
| JWT alterado o vencido | Integración strict: HTTP 401 y cero invocaciones. |
| JWT con algoritmo no permitido | Integración strict: HTTP 401 y cero invocaciones. |
| No filtración HTTP | Assertions sobre body 401: no API key/JWT completos o parciales, longitud, hash, prefijo, fragmento ni variable. |
| Configuración ausente o insegura | Unitarios de entorno: ausencia, vacío, espacios, laterales, corta, placeholders y error sin secreto. |
| Provider de configuración | Unitarios del guard: secreto recibido por inyección; ausencia de provider no autoriza. |
| Otros endpoints sin cambio | Regresión sobre health, auth y lecturas del catálogo sin API key. |
| Swagger/OpenAPI AND | `/docs-json` y YAML: un único requisito con `bearerAuth` y `catalogRefreshApiKey`. |
| Artefactos sin secretos | Test estático para Postman, `.env.example`, README, contrato y quickstart. |
| Regresión existente | Suites unitarias e integración completas sin modificar archivos existentes. |
| No filtración durante rechazos HTTP | US1: `backend/test/integration/players/catalog-api-key.spec.ts` captura logs, trazas y excepciones durante API key ausente/inválida y JWT ausente/malformado/alterado/vencido/no permitido. Verifica que no aparezcan API key, JWT, valores parciales, longitudes, hashes, prefijos ni fragmentos. |
| No filtración durante bootstrap inválido | US2: `backend/test/unit/auth/environment-catalog-refresh-api-key.spec.ts` captura logs y excepciones cuando `CATALOG_REFRESH_API_KEY` está ausente o es insegura. Verifica que no aparezcan el valor de la variable, valores parciales, longitudes, hashes, prefijos ni fragmentos. |

### Verificación de no filtración en runtime

Los tests deben capturar logs, trazas y excepciones generados durante:

- Rechazos por API key ausente o inválida.
- Rechazos por JWT ausente o inválido.
- Bootstrap con `CATALOG_REFRESH_API_KEY` ausente o insegura.

Cada caso debe verificar que no se expongan:

- La API key completa o parcial.
- El JWT completo o parcial.
- La longitud de las credenciales.
- Hashes, prefijos o fragmentos de credenciales.
- El valor de `CATALOG_REFRESH_API_KEY`.

Esta verificación debe ejecutarse automáticamente en los tests y no limitarse a una revisión manual de archivos estáticos.

Los unitarios no levantarán NestJS ni PostgreSQL. La integración utilizará Supertest y los
helpers actuales; los tests que requieren persistencia continuarán usando Testcontainers.

## Riesgos, límites y criterios de finalización

### Riesgos y mitigaciones

- **Confusión entre bytes y caracteres**: una sola constante y una sola regla documentada sobre
  bytes UTF-8 de la cadena configurada.
- **Secreto no disponible en el guard**: provider explícito desde configuración validada y
  test unitario de inyección; sin fallback a `process.env`.
- **Confusión OpenAPI OR/AND**: un único Security Requirement Object y test sobre `/docs-json`.
- **JWT o API key filtrados**: assertions sobre responses/errores más revisión de artefactos,
  logs y documentos.
- **Regresión de tests existentes**: modo legacy solo en el arnés compartido; integración
  strict separada; ningún spec existente se modifica.
- **Excepción de longitud en crypto**: comprobar tamaños antes de `timingSafeEqual` y cubrir
  longitudes distintas en unitarios e integración.

### Límites

No incluye rotación o revocación por API, múltiples claves, roles, persistencia del secreto,
hash de claves en base de datos, cambios al JWT, middleware global, cambios a otros endpoints ni
la generación de `tasks.md` en esta fase.

### Criterios de finalización

- La configuración no-test rechaza todos los valores inseguros definidos y permite una cadena
  base64url generada desde 32 bytes que tenga al menos 32 bytes UTF-8 configurados.
- El guard recibe el secreto esperado por configuración validada/inyección y no lee
  directamente `process.env`.
- Solo `POST /catalog/refresh` exige ambas credenciales; los rechazos son HTTP 401 y no
  ejecutan el refresh.
- La comparación utiliza buffers y `crypto.timingSafeEqual`, con longitudes distintas
  manejadas antes de invocarlo.
- Las responses 401 y errores de configuración no exponen credenciales ni metadatos derivados.
- Los tests nuevos y existentes pasan; build y lint quedan verdes sin modificar ni eliminar
  tests existentes.
- `/docs-json`, contrato estático, Postman, `.env.example`, README y quickstart están alineados
  y no contienen secretos.

## Constitution Check (post-design)

*GATE: PASS after Phase 1 design.*

El diseño mantiene las capas existentes, concentra la autenticación en guards, entrega el
secreto mediante configuración validada, no agrega persistencia ni dependencias, conserva el
JWT existente, limita la API key a un endpoint y protege los tests heredados. La cobertura
incluye casos felices, casos borde, integración con Supertest y validación de documentación,
por lo que no se identifica una violación constitucional que justificar.

## Complexity Tracking

No hay violaciones constitucionales ni complejidad adicional fuera del alcance. El provider de
configuración y el modo strict del arnés son necesarios para evitar lecturas directas de entorno
y preservar los tests existentes sin debilitar la validación HTTP.
