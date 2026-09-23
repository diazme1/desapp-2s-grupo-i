# Guía de verificación local: Catálogo base de jugadores

## Prerrequisitos

- Node.js 22.11.x y npm 10 o superior.
- Docker Desktop para PostgreSQL y los tests de integración con Testcontainers.
- Un token de Football-Data.org para ejecutar el refresh.

## Preparación

Desde `backend/`:

```powershell
npm.cmd ci
Copy-Item .env.example .env
```

Editar `.env` y definir `FOOTBALL_DATA_API_TOKEN`. Luego ejecutar:

```powershell
npm.cmd run migration:run
npm.cmd run build
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd start:dev
```

Las lecturas pueden ejecutarse con el token ausente si ya existe un catálogo local; el
refresh necesita el token.

## Crear una identidad para refrescar

Registrar y autenticar un usuario:

```powershell
$baseUrl = 'http://localhost:3000'
$body = @{ correo = 'catalogo@example.com'; password = 'secret123' } | ConvertTo-Json
Invoke-RestMethod "$baseUrl/auth/register" -Method Post -ContentType 'application/json' -Body $body
$login = Invoke-RestMethod "$baseUrl/auth/login" -Method Post -ContentType 'application/json' -Body $body
```

## Actualizar el catálogo

```powershell
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
$refresh = Invoke-RestMethod "$baseUrl/catalog/refresh?ligaCodigo=PL" -Method Post -Headers $headers
$refresh
```

Esperado: un resumen con `fuente`, `ligas`, `equipos`, `jugadores`, `tiempoExtraccionMs`,
`tiempoExtraccion` y `actualizadoEn`. El código
`ligaCodigo` permite actualizar una liga por vez y evitar superar la cuota de Football-Data.org.
Football-Data.org se consulta solo durante esta operación.

## Consultar localmente

```powershell
$players = Invoke-RestMethod "$baseUrl/players"
$players
$id = $players[0].id
Invoke-RestMethod "$baseUrl/players/$id"
Invoke-RestMethod "$baseUrl/players?ligaCodigo=PL"
```

Esperado: las respuestas no requieren token ni llamadas externas. Si el proveedor está
caído, estas lecturas deben seguir devolviendo el último catálogo persistido.

## Casos de validación

- `POST /catalog/refresh` sin Bearer: HTTP 401.
- Token inválido o vencido: HTTP 401.
- Proveedor sin token, con error HTTP o JSON inválido: HTTP 503 y catálogo local intacto.
- `GET /players`: HTTP 200 y lista vacía cuando no hay registros.
- `GET /players/:id` con UUID inexistente: HTTP 404.
- `GET /players/:id` con formato inválido: HTTP 422.
- Repetir refresh: misma cantidad de registros y mismo UUID interno por jugador.

## Documentación y Postman

- Swagger: `http://localhost:3000/docs`.
- OpenAPI de referencia: [contracts/openapi.yaml](contracts/openapi.yaml).
- Colección: [docs/postman/players-catalog.postman_collection.json](../../docs/postman/players-catalog.postman_collection.json).

WhoScored, estadísticas y `GET /players/:id/estadisticas` no forman parte de esta guía ni
de la primera etapa.
