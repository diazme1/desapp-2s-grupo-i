# Guía de verificación local: API key para refresh del catálogo

## Prerrequisitos

- Node.js 22.11.x y npm 10 o superior.
- Docker Desktop para PostgreSQL y Testcontainers.
- Un `FOOTBALL_DATA_API_TOKEN` si se desea ejecutar un refresh contra el proveedor real.
- Una base PostgreSQL disponible según la configuración actual del backend.

## Política de configuración

`CATALOG_REFRESH_API_KEY` debe contener una cadena base64url generada desde 32 bytes de
aleatoriedad criptográfica. La validación operativa se realiza sobre los bytes UTF-8 de la
cadena configurada y exige al menos 32 bytes. No se valida una cantidad alternativa de
caracteres ni bytes decodificados.

En ambientes no-test se rechazan ausencia, vacío, solo espacios, espacios laterales, valores
menores a 32 bytes UTF-8 y estos placeholders:

```text
change-me
changeme
your-api-key
your-secret
secret
test
```

La lista se aplica únicamente a la configuración del servidor; nunca se usa para clasificar
el valor recibido en `X-API-Key`.

## Preparar la configuración

Desde `backend/`, copiar el ejemplo y generar una clave nueva antes de iniciar el proceso:

```powershell
npm.cmd ci
Copy-Item .env.example .env
$env:CATALOG_REFRESH_API_KEY = node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

La misma generación en Bash es:

```bash
export CATALOG_REFRESH_API_KEY="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))")"
```

Persistir el valor generado solo en el mecanismo de secretos del entorno de despliegue o en
`backend/.env` local sin versionarlo. Completar también `DATABASE_URL`, `JWT_SECRET` de al
menos 32 caracteres y `FOOTBALL_DATA_API_TOKEN` si corresponde. No copiar una clave real a
`.env.example`, README, Swagger, Postman ni contratos.

La aplicación debe rechazar el inicio en un ambiente no-test si la variable falta, es insegura
o usa uno de los placeholders canónicos. El guard recibirá el secreto desde la configuración
validada de la aplicación; no se valida leyendo `process.env` directamente desde el guard.

## Orden de validación automatizada

El orden previsto es:

1. Helper criptográfico y tests unitarios.
2. Configuración validada y tests de bootstrap.
3. Provider/guard y composición con JWT.
4. Integración strict y regresión.
5. Documentación, build, lint y validación final.

Desde `backend/`:

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run test:integration
```

La integración requiere Docker. La suite nueva puede ejecutarse de forma aislada:

```powershell
npm.cmd run test:integration -- --runTestsByPath test/integration/players/catalog-api-key.spec.ts
```

## Escenarios verificables

La suite strict debe comprobar:

- JWT válido + API key válida: HTTP 200, resumen vigente y una única actualización.
- API key ausente: HTTP 401 y cero invocaciones.
- API key vacía: HTTP 401 y cero invocaciones.
- API key compuesta solo por espacios: HTTP 401 y cero invocaciones.
- API key con espacios laterales: HTTP 401, sin trimming, y cero invocaciones.
- API key inválida de igual longitud: HTTP 401 y cero invocaciones.
- API key inválida de longitud distinta: HTTP 401 sin excepción interna y cero invocaciones.
- JWT ausente: HTTP 401 y cero invocaciones.
- JWT malformado: HTTP 401 y cero invocaciones.
- JWT alterado o vencido: HTTP 401 y cero invocaciones.
- JWT firmado con algoritmo no permitido: HTTP 401 y cero invocaciones.

Cada respuesta 401 debe ser genérica y no contener API key, JWT, longitud, hash, prefijo,
fragmentos ni el valor de `CATALOG_REFRESH_API_KEY`. Los errores de configuración deben
identificar como máximo el nombre de la variable y la regla incumplida, sin valores completos,
parciales o derivados.

Los endpoints fuera de refresh —por ejemplo `GET /players`, `GET /auth/me` y health— deben
conservar su contrato y no requerir `X-API-Key`.

## Verificación manual del endpoint

Iniciar el backend después de cargar la variable:

```powershell
npm.cmd run migration:run
npm.cmd start:dev
```

Registrar e iniciar sesión como en la colección de Postman. Luego enviar el refresh con las
dos credenciales:

```powershell
$baseUrl = 'http://localhost:3000'
$body = @{ correo = 'catalogo@example.com'; password = 'secret123' } | ConvertTo-Json
Invoke-RestMethod "$baseUrl/auth/register" -Method Post -ContentType 'application/json' -Body $body
$login = Invoke-RestMethod "$baseUrl/auth/login" -Method Post -ContentType 'application/json' -Body $body
$headers = @{
  Authorization = "Bearer $($login.accessToken)"
  'X-API-Key' = $env:CATALOG_REFRESH_API_KEY
}
$refresh = Invoke-RestMethod "$baseUrl/catalog/refresh?ligaCodigo=PL" -Method Post -Headers $headers
$refresh
```

Repetir la request eliminando o alterando una credencial según los escenarios anteriores. No
guardar ninguno de los valores obtenidos en archivos versionados.

## Verificar Swagger/OpenAPI

Abrir `http://localhost:3000/docs` y comprobar que `POST /catalog/refresh` muestra ambos
esquemas. También revisar el documento JSON:

```powershell
$openapi = Invoke-RestMethod 'http://localhost:3000/docs-json'
$openapi.components.securitySchemes.catalogRefreshApiKey.name
$openapi.paths.'/catalog/refresh'.post.security | ConvertTo-Json -Depth 5
```

Debe aparecer `X-API-Key` y un único requisito que contenga `bearerAuth` y
`catalogRefreshApiKey`. No debe aparecer un valor de clave, JWT, longitud, hash, prefijo o
fragmento.

## Verificar Postman y documentación

Importar [docs/postman/players-catalog.postman_collection.json](../../docs/postman/players-catalog.postman_collection.json),
completar `catalogRefreshApiKey` solo en el environment local y ejecutar el request de
actualización. Los requests de lectura no deben enviar ni requerir API key.

Revisar también `backend/.env.example`, `README.md`, `backend/README.md` y
[contracts/openapi.yaml](contracts/openapi.yaml) para confirmar que describen la política de
generación, configuración, header, placeholders y errores sin contener secretos reales.
