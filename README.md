# Proyecto para la materia **Desarrollo de Aplicaciones** de la **Universidad Nacional de Quilmes (UNQ)**.

## Tecnologías

- **Backend:** NestJS y TypeScript.
- **Base de datos:** PostgreSQL.
- **Frontend:** Vite, React y TypeScript.
- **Comunicación:** HTTP mediante APIs REST.
- **Documentación de la API:** Swagger/OpenAPI.
- **Tests:** Jest y Vitest.
- **Metodología:** Spec-Driven Development (SDD) con Spec Kit.

## Levantar toda la aplicación con Docker

Requisitos: **Docker Desktop con Docker Compose**.

Desde la raíz del repositorio:

```powershell
docker compose up --build
```

Esto inicia PostgreSQL, la API y el frontend de Vite. Quedan disponibles:

- Frontend: http://localhost:5173
- API: http://localhost:3000
- PostgreSQL: localhost:5433
- Swagger: http://localhost:3000/docs
- Health: http://localhost:3000/health

El frontend utiliza `/api` para comunicarse con la API a través del proxy de Vite.
Dentro de Docker, ese proxy apunta al servicio `api` de Compose.

Para detener los servicios:

```powershell
docker compose down
```

Los datos de PostgreSQL se conservan en el volumen `postgres_data`.

## Levantar el backend de forma local

Requisitos: **Node.js 22.11.0** y **npm 10 o superior**.

Desde la raíz del repositorio:

```powershell
cd backend
npm ci
npm run start:dev
```

## Levantar el frontend de forma local

En otra terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Abrir http://localhost:5173.

### Catálogo base de jugadores

La Parte 1 del catálogo persiste ligas, equipos y jugadores localmente en PostgreSQL.
Las consultas no llaman a proveedores externos:

- `GET /players` lista el catálogo local; acepta opcionalmente `?ligaCodigo=PL`.
- `GET /players/:id` devuelve el detalle de un jugador por su UUID interno.
- `POST /catalog/refresh?ligaCodigo=PL` actualiza una liga del catálogo base desde Football-Data.org
  y requiere simultáneamente un JWT Bearer y el header `X-API-Key`. Configurá
  `FOOTBALL_DATA_API_TOKEN` y `CATALOG_REFRESH_API_KEY` en el `.env` local para ejecutarlo.

`CATALOG_REFRESH_API_KEY` debe ser una cadena base64url generada desde al menos 32 bytes de
aleatoriedad criptográfica. Para desarrollo, generala sin copiarla al repositorio:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

La aplicación valida al menos 32 bytes UTF-8 de configuración y rechaza valores vacíos,
espacios laterales, solo espacios y los placeholders `change-me`, `changeme`, `your-api-key`,
`your-secret`, `secret` y `test` en ambientes no-test. Una API key ausente o inválida responde
401 sin revelar credenciales; los demás endpoints conservan su comportamiento y no requieren
`X-API-Key`. El valor real debe permanecer únicamente en el mecanismo de secretos del entorno o
en un `.env` local no versionado.

La actualización acepta una liga por request mediante `ligaCodigo` y respeta un intervalo entre
solicitudes externas configurado con `FOOTBALL_DATA_REQUEST_DELAY_MS`. WhoScored y las estadísticas
quedan fuera de esta primera parte.
