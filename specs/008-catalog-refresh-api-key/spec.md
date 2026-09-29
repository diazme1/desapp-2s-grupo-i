# Feature Specification: Protección API key para refresh del catálogo

**Feature Branch**: `feat/api-key-admin`

**Created**: 2026-09-29

**Status**: Draft

**Input**: Agregar protección adicional mediante API key para el endpoint existente `POST /catalog/refresh`, cuyo caso de uso actual es actualizar el catálogo de jugadores.

## Contexto y alcance

`POST /catalog/refresh` actualiza el catálogo de jugadores y actualmente requiere un
JWT Bearer. Esta feature agrega una segunda credencial obligatoria, exclusiva para ese
endpoint: una API key secreta de servidor recibida en `X-API-Key`.

La decisión previa de excluir API keys de la feature de autenticación JWT queda limitada
por esta necesidad específica del endpoint de actualización de catálogo. Esa excepción no
habilita API keys en otros endpoints, no agrega roles administrativos y no modifica el
comportamiento de las demás rutas.

Esta especificación define también la configuración, los límites mínimos del secreto, la
generación segura, la comparación resistente a timing attacks, el manejo de errores, la
documentación y la cobertura de tests. No implementa todavía la funcionalidad.

La política única de seguridad de la API key es la siguiente: para desarrollo y despliegue
se genera una cadena base64url a partir de 32 bytes de aleatoriedad criptográfica. La regla
mínima de configuración se verifica sobre los bytes UTF-8 de la cadena configurada y exige
al menos 32 bytes. Esta es la única unidad usada para expresar el mínimo; no se combinan
reglas distintas de caracteres, bytes aleatorios o bytes decodificados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Actualizar el catálogo con doble credencial (Priority: P1)

Como integrante autorizado del sistema, quiero actualizar el catálogo presentando el JWT
Bearer existente y una API key privada del servidor, para impedir que una sesión JWT por sí
sola pueda ejecutar una operación de actualización.

**Why this priority**: El refresh modifica datos del catálogo y es la única operación que
necesita una protección adicional en esta feature.

**Independent Test**: Preparar un catálogo y una fuente externa controlada, enviar requests
a `POST /catalog/refresh` con las combinaciones de JWT y `X-API-Key` definidas abajo y
verificar tanto el código HTTP como que la actualización se ejecute únicamente cuando ambas
credenciales sean válidas.

**Acceptance Scenarios**:

1. **Given** un JWT Bearer válido y vigente y una API key válida en `X-API-Key`, **When** se
   solicita `POST /catalog/refresh`, **Then** responde exitosamente con el mismo resumen de
   actualización vigente y ejecuta la actualización una sola vez.
2. **Given** un JWT válido pero sin `X-API-Key`, **When** se solicita `POST /catalog/refresh`,
   **Then** responde HTTP 401 y no invoca la actualización del catálogo ni la fuente externa.
3. **Given** un JWT válido y un `X-API-Key` vacío, **When** se solicita `POST /catalog/refresh`,
   **Then** responde HTTP 401 y no invoca la actualización.
4. **Given** un JWT válido y un `X-API-Key` compuesto solo por espacios, **When** se solicita
   `POST /catalog/refresh`, **Then** responde HTTP 401 y no invoca la actualización.
5. **Given** un JWT válido y un `X-API-Key` con espacios laterales, **When** se solicita
   `POST /catalog/refresh`, **Then** responde HTTP 401 y no invoca la actualización; el valor
   no se recorta ni se normaliza para autorizar la request.
6. **Given** un JWT válido y un `X-API-Key` inválido con igual longitud que el secreto
   configurado, **When** se solicita `POST /catalog/refresh`, **Then** responde HTTP 401 y no
   invoca la actualización.
7. **Given** un JWT válido y un `X-API-Key` inválido con longitud distinta a la configurada,
   **When** se solicita `POST /catalog/refresh`, **Then** responde HTTP 401 sin excepción
   interna y no invoca la actualización.
8. **Given** una API key válida pero sin encabezado `Authorization`, **When** se solicita
   `POST /catalog/refresh`, **Then** responde HTTP 401 y no invoca la actualización.
9. **Given** una API key válida y un JWT malformado, **When** se solicita
   `POST /catalog/refresh`, **Then** responde HTTP 401 y no invoca la actualización.
10. **Given** una API key válida y un JWT alterado o vencido, **When** se solicita
    `POST /catalog/refresh`, **Then** responde HTTP 401 y no invoca la actualización.
11. **Given** una API key válida y un JWT firmado con un algoritmo no permitido, **When** se
    solicita `POST /catalog/refresh`, **Then** responde HTTP 401 y no invoca la actualización.
12. **Given** cualquier combinación inválida de credenciales, **When** se rechaza la request,
    **Then** la respuesta HTTP no contiene la API key completa o parcial, el JWT completo o
    parcial, la longitud del secreto, un hash, prefijo o fragmento de credenciales, ni el
    valor de `CATALOG_REFRESH_API_KEY`, y no revela cuál credencial falló.

### User Story 2 - Iniciar la aplicación con un secreto seguro (Priority: P1)

Como responsable de despliegue, quiero configurar la API key como un secreto externo y
recibir un rechazo temprano si la configuración no es segura, para no iniciar el servicio
con una protección predecible o inexistente.

**Why this priority**: Una configuración ausente o débil anularía la protección del endpoint
antes de que pueda utilizarse de forma segura.

**Independent Test**: Iniciar la aplicación con una configuración válida, ausente, vacía,
compuesta solo por espacios, con espacios laterales, con menos de 32 bytes UTF-8 o igual a
cualquiera de los placeholders canónicos, y verificar que solo la configuración válida
permita iniciar en ambientes no-test.

**Acceptance Scenarios**:

1. **Given** un ambiente no-test y `CATALOG_REFRESH_API_KEY` ausente, vacía, compuesta solo
   por espacios, con espacios laterales, con menos de 32 bytes UTF-8 o igual a uno de los
   placeholders canónicos (`change-me`, `changeme`, `your-api-key`, `your-secret`, `secret` o
   `test`), **When** se inicia la aplicación, **Then** la configuración se rechaza antes de
   aceptar requests y el mensaje identifica la variable y la regla incumplida sin incluir su
   valor.
2. **Given** un ambiente no-test y una `CATALOG_REFRESH_API_KEY` válida, **When** se inicia
   la aplicación, **Then** el servicio inicia y puede validar requests de refresh con esa
   clave.
3. **Given** un ambiente de tests, **When** se prepara la aplicación para una prueba, **Then**
   se permite usar una fixture controlada para evitar depender de un secreto de despliegue,
   pero el endpoint continúa exigiendo una API key válida en cada escenario protegido.
4. **Given** una persona desarrolladora u operadora que necesita una clave, **When** utiliza
   el procedimiento documentado de generación segura, **Then** obtiene una cadena base64url
   generada desde 32 bytes de aleatoriedad criptográfica y cuya representación configurada
   cumple al menos 32 bytes UTF-8, sin agregar dependencias externas.

### User Story 3 - Mantener el contrato existente y su documentación (Priority: P2)

Como consumidora del sistema, quiero que solo cambie la protección de `POST /catalog/refresh`
y que el contrato quede reflejado en la documentación y colecciones de prueba, para poder
actualizar el catálogo sin romper las demás integraciones.

**Why this priority**: La seguridad adicional debe ser operable y no puede introducir
regresiones en los endpoints ni en los artefactos de desarrollo ya existentes.

**Independent Test**: Ejecutar los tests existentes sin editar ni eliminar sus archivos,
probar endpoints distintos de `POST /catalog/refresh` con los headers que ya requerían y
revisar `.env.example`, Swagger/OpenAPI y Postman para comprobar que describen el nuevo
contrato sin contener secretos reales.

**Acceptance Scenarios**:

1. **Given** un endpoint distinto de `POST /catalog/refresh`, **When** se lo invoca con el
   esquema de autenticación que tenía antes, **Then** conserva su protección, respuesta y
   comportamiento, y no requiere `X-API-Key` salvo que una feature posterior lo defina.
2. **Given** la documentación de Swagger/OpenAPI, **When** se consulta el contrato de
   `POST /catalog/refresh`, **Then** se muestran simultáneamente Bearer JWT y API key en
   `X-API-Key` como requisitos, junto con las respuestas 200, 401 y los errores existentes,
   sin mostrar ningún valor secreto.
3. **Given** la colección Postman y `.env.example`, **When** una persona prepara un entorno
   de desarrollo o despliegue, **Then** encuentra la variable y el header necesarios, un
   placeholder vacío o no secreto, y el procedimiento de generación, sin que se almacene una
   API key real.
4. **Given** los tests existentes del proyecto, **When** se implementa esta feature, **Then**
   ningún test existente se modifica ni elimina y la suite conserva su comportamiento; el
   soporte común de tests puede ampliarse para proveer una fixture válida sin debilitar los
   escenarios que verifican una API key ausente o inválida.

### Edge Cases

- La cadena operativa se genera como base64url desde 32 bytes de aleatoriedad criptográfica;
  la configuración es válida solo si sus bytes UTF-8 tienen al menos 32 bytes. No se usa una
  regla alternativa basada en cantidad de caracteres o bytes decodificados.
- El header `X-API-Key` está ausente, vacío, compuesto solo por espacios, contiene espacios
  laterales, está repetido o contiene caracteres adicionales: la request debe rechazarse con
  HTTP 401 y no debe ejecutarse el refresh.
- La API key recibida tiene la misma longitud y prefijo que la configurada, pero no coincide:
  debe rechazarse sin comparación directa de strings y sin diferenciar el motivo en la
  respuesta.
- La API key recibida tiene una longitud diferente: debe rechazarse sin provocar una
  excepción interna ni exponer información sobre la clave configurada.
- El JWT falta, está malformado, fue alterado, venció o usa un algoritmo no permitido aunque
  la API key sea válida: debe conservarse el rechazo HTTP 401 y no debe ejecutarse el refresh.
- La configuración contiene un secreto de ejemplo, un valor truncado o espacios accidentales:
  en ambientes no-test debe fallar la validación de inicio.
- En ambientes no-test se rechazan, como mínimo, los placeholders canónicos `change-me`,
  `changeme`, `your-api-key`, `your-secret`, `secret` y `test`. La comparación contra esta
  lista se realiza únicamente sobre `CATALOG_REFRESH_API_KEY` configurada; nunca sobre el
  valor recibido en `X-API-Key`.
- El guard recibe el secreto desde la configuración validada de la aplicación, preferentemente
  mediante inyección de configuración; no lee directamente `process.env` ni realiza lecturas
  no controladas de variables de entorno.
- La aplicación falla al iniciar por la configuración: el error puede identificar
  `CATALOG_REFRESH_API_KEY` y la regla incumplida, pero nunca su valor completo o parcial, el
  JWT, su longitud, hash, prefijo, fragmento o cualquier valor transformado.
- Cualquier respuesta HTTP o error de configuración debe excluir la API key completa o parcial,
  el JWT completo o parcial, la longitud del secreto, hashes, prefijos, fragmentos y el valor
  de la variable de entorno.
- Los endpoints de lectura del catálogo, autenticación, health y cualquier otro endpoint
  existente deben conservar sus headers, códigos, cuerpos y reglas de acceso actuales.
- La clave se rota modificando la configuración y reiniciando la aplicación; no se define en
  esta feature una API de rotación ni una persistencia de claves.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST exigir, únicamente para `POST /catalog/refresh`, un JWT Bearer
  válido y vigente y una API key válida recibida en el header HTTP `X-API-Key`.
- **FR-002**: El sistema MUST obtener la API key esperada exclusivamente de la variable de
  entorno `CATALOG_REFRESH_API_KEY`, incorporarla a la configuración validada de la aplicación
  y suministrarla al guard mediante inyección de configuración o un mecanismo equivalente
  controlado. El guard MUST NOT leer directamente `process.env` ni realizar lecturas no
  controladas de variables de entorno. El sistema MUST NOT incluir una clave por defecto en
  el código, la configuración o el ambiente de ejecución.
- **FR-003**: La ausencia, vacío, formato no válido o valor incorrecto de `X-API-Key` MUST
  responder HTTP 401 y MUST NOT ejecutar la actualización del catálogo, llamar a la fuente
  externa ni cambiar datos.
- **FR-004**: La ausencia, malformación, alteración, vencimiento o invalidez criptográfica del
  JWT MUST responder HTTP 401 y MUST NOT ejecutar la actualización, aun cuando la API key sea
  válida.
- **FR-005**: La comparación de la API key recibida con el secreto configurado MUST ser
  resistente a timing attacks, MUST operar sobre valores binarios de igual longitud cuando
  corresponda y MUST NOT usar comparación directa de strings ni equivalentes que permitan
  inferir coincidencias parciales.
- **FR-006**: La API key MUST generarse para desarrollo y despliegue utilizando el módulo
  criptográfico nativo de Node.js, con al menos 32 bytes de aleatoriedad criptográfica; el
  procedimiento documentado utilizará 32 bytes y su representación operativa MUST ser una
  cadena base64url transportable generada desde esos bytes. La validación mínima MUST realizarse
  sobre los bytes UTF-8 de la cadena configurada y exigir al menos 32 bytes; no se deben mezclar
  reglas alternativas de cantidad de caracteres, bytes aleatorios o bytes decodificados. MUST
  NOT agregar dependencias externas para esa generación o comparación.
- **FR-007**: En ambientes no-test, la validación de configuración MUST rechazar antes de
  iniciar el servidor cualquier `CATALOG_REFRESH_API_KEY` ausente, vacía, compuesta solo por
  espacios, con espacios laterales, cuyos bytes UTF-8 sean menores que 32, o igual a uno de
  los placeholders canónicos `change-me`, `changeme`, `your-api-key`, `your-secret`, `secret`
  o `test`. La comparación contra placeholders MUST realizarse únicamente sobre la
  configuración, nunca sobre la API key recibida. La validación MUST informar la variable y el
  requisito incumplido sin informar el secreto.
- **FR-008**: La configuración de test podrá utilizar una fixture controlada, pero esa
  excepción MUST limitarse a la validación del secreto de despliegue; las requests de
  `POST /catalog/refresh` en tests MUST seguir exigiendo una API key válida.
- **FR-009**: Las respuestas 401 por JWT o API key MUST mantener el formato de error HTTP
  existente y un mensaje genérico; MUST NOT indicar cuál credencial falló ni incluir la API key
  completa o parcial, el JWT completo o parcial, la longitud del secreto, un hash, prefijo,
  fragmento, token o valor de variable de entorno secreta.
- **FR-010**: El valor de `CATALOG_REFRESH_API_KEY` y la API key recibida MUST estar ausentes
  de logs, trazas, mensajes de excepción, respuestas HTTP, ejemplos de Swagger/OpenAPI,
  definiciones de Postman y archivos `.env.example`, tanto completos como parciales o
  transformados. También MUST estar ausentes el JWT completo o parcial, la longitud del secreto,
  cualquier hash, prefijo o fragmento de credencial y el valor de la variable de entorno. Los
  logs de configuración solo podrán referir el nombre de la variable y su estado válido o
  inválido.
- **FR-011**: Swagger/OpenAPI MUST documentar para `POST /catalog/refresh` el esquema Bearer
  JWT, el esquema de API key en `X-API-Key`, la exigencia conjunta de ambos y las respuestas
  relevantes, sin incluir un valor de secreto.
- **FR-012**: La colección Postman MUST agregar una variable no secreta para la API key y
  enviar esa variable en `X-API-Key` para el request de refresh, sin persistir una clave real
  ni exigirla en los demás requests.
- **FR-013**: `backend/.env.example` y la documentación operativa MUST incluir
  `CATALOG_REFRESH_API_KEY` sin valor real, los requisitos mínimos del secreto, el comando o
  procedimiento para generar una clave segura y la advertencia de no versionar secretos.
- **FR-014**: Los endpoints distintos de `POST /catalog/refresh` MUST conservar su protección,
  comportamiento, códigos y cuerpos actuales; ninguno MUST empezar a exigir API key como
  efecto colateral de esta feature.
- **FR-015**: La feature MUST incluir tests unitarios para validación de configuración,
  generación o formato seguro y comparación resistente a timing attacks, y tests de
  integración para todos los escenarios de aceptación y casos borde. La integración MUST
  cubrir explícitamente JWT ausente, malformado, alterado, vencido y firmado con un algoritmo
  no permitido; API key ausente, vacía, compuesta solo por espacios, con espacios laterales,
  inválida con igual longitud e inválida con longitud distinta. Los tests MUST comprobar que
  cada rechazo responde HTTP 401, no ejecuta la actualización y no filtra credenciales ni
  metadatos derivados.
- **FR-016**: Ningún test existente MUST modificarse ni eliminarse. Si el soporte compartido
  de tests necesita una fixture o configuración para preservar los casos existentes, el
  cambio deberá ser aditivo y MUST mantener pruebas aisladas para API key ausente e inválida.
- **FR-017**: La documentación y los artefactos de contrato MUST permanecer en español,
  conservar los términos técnicos normativos en inglés y reflejar que la excepción de API key
  se limita a `POST /catalog/refresh`.

### Key Entities

- **Secreto de refresh**: credencial privada del servidor configurada mediante
  `CATALOG_REFRESH_API_KEY`; su representación operativa es una cadena base64url generada
  desde 32 bytes de aleatoriedad criptográfica. Sus bytes UTF-8 configurados deben tener al
  menos 32 bytes y no forma parte de respuestas ni documentación pública.
- **Credenciales de refresh**: combinación de un JWT Bearer del sistema y el header
  `X-API-Key`; ambas deben ser válidas para autorizar la operación.
- **Solicitud de actualización de catálogo**: request a `POST /catalog/refresh` que, solo
  después de superar las dos autenticaciones, puede invocar la actualización existente y
  devolver su resumen actual.
- **Configuración de ejecución**: conjunto de variables que permite iniciar la aplicación;
  incluye el secreto de refresh y distingue ambientes no-test de la configuración controlada
  de tests. La configuración validada se suministra al guard mediante inyección o un mecanismo
  equivalente controlado; el guard no lee directamente variables de entorno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las requests de `POST /catalog/refresh` con JWT válido y API key
  válida ejecuta la actualización y conserva el resumen y código exitoso vigentes.
- **SC-002**: El 100 % de las requests de refresh con API key ausente, vacía, compuesta solo
  por espacios, con espacios laterales, inválida con igual longitud o inválida con longitud
  distinta responde HTTP 401 y registra cero invocaciones a la actualización o a su fuente
  externa.
- **SC-003**: El 100 % de las requests de refresh con JWT ausente, malformado, alterado,
  vencido o firmado con un algoritmo no permitido responde HTTP 401 y registra cero
  invocaciones a la actualización.
- **SC-004**: El 100 % de los arranques no-test con secreto ausente, vacío, compuesto solo por
  espacios, con espacios laterales, con menos de 32 bytes UTF-8 o igual a un placeholder
  canónico se rechaza antes de aceptar requests, y el 100 % de los arranques con un secreto
  válido puede iniciar.
- **SC-005**: En una revisión de logs, respuestas HTTP, errores de configuración,
  Swagger/OpenAPI, Postman y archivos de ejemplo no aparece la API key ni el JWT completos o
  parciales, la longitud del secreto, un hash, prefijo, fragmento, valor transformado o el
  valor de la variable de entorno.
- **SC-006**: El 100 % de los endpoints distintos de `POST /catalog/refresh` mantiene sus
  tests y comportamiento previo sin requerir `X-API-Key`.
- **SC-007**: El 100 % de los escenarios de aceptación y de los casos borde definidos para la
  feature queda cubierto por tests unitarios o de integración, incluyendo los casos explícitos
  de JWT y API key, las respuestas sin filtraciones y la no ejecución del refresh, sin modificar
  ni eliminar tests existentes.
- **SC-008**: Una persona operadora puede generar y configurar una nueva cadena base64url desde
  32 bytes de aleatoriedad criptográfica siguiendo únicamente la documentación de `.env.example`,
  README, Swagger/OpenAPI y Postman, sin copiar secretos desde el código fuente ni desde un
  artefacto versionado.

## Assumptions

- El header HTTP es `X-API-Key`; los nombres de header se consideran sin distinción de
  mayúsculas y minúsculas según HTTP, pero el valor de la clave se valida sin agregar,
  quitar ni normalizar espacios.
- La representación operativa de la API key es una cadena base64url generada desde 32 bytes
  de aleatoriedad criptográfica. La validación mínima se realiza sobre los bytes UTF-8 de la
  cadena configurada y exige al menos 32 bytes; no se usa una regla separada de caracteres o
  bytes decodificados.
- La API key es un secreto compartido de servidor para este caso de uso y no identifica por
  sí sola a una persona ni reemplaza la identidad del JWT.
- La respuesta para API key ausente e inválida será HTTP 401 con el mensaje genérico vigente;
  la diferenciación necesaria para operar se documenta en esta especificación y en tests,
  no en la respuesta pública.
- `NODE_ENV=test` puede usar un secreto de fixture controlado para no depender de secretos
  reales; el endpoint no queda exento de validar el header en esos tests. El guard recibe la
  fixture desde la configuración validada de la aplicación mediante inyección o un mecanismo
  equivalente controlado y no lee directamente `process.env`.
- En ambientes no-test se rechazan, como mínimo, los placeholders `change-me`, `changeme`,
  `your-api-key`, `your-secret`, `secret` y `test`, además de valores vacíos o compuestos solo
  por espacios. La comparación contra placeholders se aplica únicamente a la configuración,
  nunca al valor recibido en `X-API-Key`.
- La rotación se realiza fuera de la API mediante cambio de configuración y reinicio. La
  gestión de múltiples claves, expiración automática, revocación y distribución de secretos
  quedan fuera de alcance.
- El resumen, la lógica de actualización, la selección de liga, la persistencia, los errores
  de la fuente externa y las lecturas locales se mantienen como están definidos por la feature
  de catálogo existente cuando las dos credenciales son válidas.
- La documentación de Postman puede utilizar una variable vacía o un placeholder no secreto;
  cada entorno deberá completar su propio valor fuera del repositorio.
- Los tests existentes se preservan textualmente; cualquier adaptación necesaria del soporte
  común de integración será aditiva y no podrá ocultar los escenarios de rechazo de esta
  feature.
