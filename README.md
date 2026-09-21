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
