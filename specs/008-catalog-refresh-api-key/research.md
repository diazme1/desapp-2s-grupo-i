# Research: Protección API key para refresh del catálogo

**Fecha**: 2026-09-29
**Feature**: [spec.md](spec.md)

## R1. Representación y mínimo operativo del secreto

**Decision**: La generación oficial usa `randomBytes(32).toString('base64url')`. La cadena
resultante es la representación operativa que se carga en `CATALOG_REFRESH_API_KEY` y se envía
en `X-API-Key`. La validación mínima se realiza sobre los bytes UTF-8 de la cadena configurada
y exige al menos 32 bytes.

**Rationale**: Esta política separa claramente la aleatoriedad criptográfica usada para generar
la clave de la representación transportable que utiliza la aplicación. Una salida base64url de
32 bytes aleatorios es apta para headers y variables de entorno; al validar la representación
configurada con una sola unidad —bytes UTF-8— se evita mezclar reglas de caracteres, bytes
aleatorios y bytes decodificados.

**Alternatives considered**:

- Mínimo de 32 caracteres: descartado porque no expresa la unidad normativa elegida.
- Validar bytes decodificados del base64url: descartado porque la regla operativa se aplica a
  la cadena configurada, no a una segunda representación.
- Hexadecimal: descartado para esta feature porque el contrato documentado fija base64url.
- Clave por defecto o fixture en producción: descartada por riesgo de configuración predecible.

## R2. Comparación resistente a timing attacks

**Decision**: El helper puro convierte configuración y candidato a `Buffer` UTF-8. Rechaza
valores no únicos, vacíos o con longitudes diferentes antes de invocar
`crypto.timingSafeEqual`; solo compara buffers de igual longitud.

**Rationale**: `timingSafeEqual` requiere operandos de igual longitud y puede lanzar una
excepción si no se cumple. El rechazo temprano evita una respuesta 500 y mantiene un resultado
uniforme de autorización. No se usan comparaciones directas de strings, prefijos, padding ni
hashes ad-hoc.

**Alternatives considered**:

- `===`, `==`, `localeCompare` o prefijos: descartados porque comparan strings directamente.
- Invocar siempre `timingSafeEqual`: descartado porque las longitudes distintas generan error.
- Padding o hashing adicional: descartados porque agregan una política no requerida y no
  sustituyen la validación explícita de longitud.

## R3. Fuente de configuración e inyección al guard

**Decision**: `CATALOG_REFRESH_API_KEY` se valida durante el bootstrap y se publica mediante
la configuración validada de la aplicación. `CatalogRefreshApiKeyGuard` recibe el secreto
esperado mediante inyección de configuración o un provider explícito registrado en `AuthModule`.
El guard no lee directamente `process.env`.

**Rationale**: La configuración centralizada permite rechazar el proceso antes de aceptar
requests, probar el guard con una dependencia explícita y evitar lecturas inconsistentes del
entorno. El guard queda limitado a leer el header de la request y delegar la comparación al
helper.

**Alternatives considered**:

- Leer `process.env` desde el guard: descartado porque evita la configuración validada y
  dificulta el aislamiento unitario.
- Cargar `.env` desde el guard: descartado porque duplica responsabilidades del bootstrap.
- Usar un fallback por defecto: descartado porque contradice FR-002.

## R4. Placeholders canónicos

**Decision**: En ambientes no-test se rechazan como mínimo `change-me`, `changeme`,
`your-api-key`, `your-secret`, `secret` y `test`, además de ausencia, vacío, solo espacios,
espacios laterales y menos de 32 bytes UTF-8. La detección se implementa en la política de
configuración del helper y se invoca desde `validateEnvironment`.

La comparación contra placeholders se aplica únicamente al valor configurado; el header
recibido nunca se clasifica por pertenecer a esa lista, sino que se compara byte a byte contra
el secreto esperado.

**Rationale**: Una lista cerrada permite tests deterministas y evita que un placeholder público
se convierta accidentalmente en secreto de despliegue. La restricción por ambiente mantiene la
fixture controlada de tests sin convertirla en una excepción del guard.

## R5. Frontera NestJS y composición de credenciales

**Decision**: Registrar `CatalogRefreshApiKeyGuard` en `AuthModule` y aplicarlo junto con el
`JwtAuthGuard` existente únicamente en el método refresh del Controller de jugadores.

**Rationale**: Los guards son la frontera HTTP adecuada y evitan que una request no autorizada
alcance `ActualizarCatalogoService` o el Adapter externo. Mantener `JwtAuthGuard` sin cambios
preserva `/auth/me` y las demás rutas.

## R6. Casos de integración y no filtración

**Decision**: La suite strict cubrirá JWT válido, ausente, malformado, alterado, vencido y con
algoritmo no permitido; API key válida, ausente, vacía, solo espacios, con espacios laterales,
inválida de igual longitud e inválida de longitud distinta.

Cada rechazo verificará HTTP 401, cero invocaciones a actualización/Adapter y un body que no
contenga API key, JWT, longitud, hash, prefijo, fragmento ni valor de variable de entorno. Los
unitarios de configuración verificarán el mismo criterio sobre errores de bootstrap.

## R7. OpenAPI AND y documentación

**Decision**: Registrar `catalogRefreshApiKey` como `apiKey` en header `X-API-Key` y expresar
en `/docs-json` y el contrato YAML un único Security Requirement Object con `bearerAuth` y
`catalogRefreshApiKey`.

**Rationale**: En OpenAPI, varios esquemas dentro del mismo objeto son requisitos simultáneos;
objetos separados pueden representar alternativas OR. El test inspeccionará el JSON servido,
no solo las anotaciones.

## R8. Compatibilidad de tests existentes

**Decision**: No se modifica ningún spec existente. `players-integration-app.ts` tendrá un
modo legacy con fixture local para conservar el flujo actual y un modo strict para los nuevos
escenarios. La variable de entorno se restaura al cerrar el arnés.

**Rationale**: La ampliación aditiva respeta FR-016 y permite probar el contrato real sin
desactivar la API key en todo `NODE_ENV=test`.

**Referencias primarias**: documentación oficial de Node.js Crypto API para `randomBytes` y
`timingSafeEqual`; documentación OpenAPI sobre Security Requirement Objects; documentación
local de NestJS Swagger y configuración existente del backend.
