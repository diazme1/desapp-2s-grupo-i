# Proyecto para la materia **Desarrollo de Aplicaciones** de la **Universidad Nacional de Quilmes (UNQ)**.

## Tecnologías

- **Backend:** NestJS y TypeScript.
- **Base de datos:** PostgreSQL 
- **Frontend:** React y TypeScript 
- **Comunicación:** HTTP mediante APIs REST.
- **Documentación de la API:** Swagger/OpenAPI.
- **Tests:** Jest.
- **Metodología:** Spec-Driven Development (SDD) con Spec Kit.

## Levantar el backend

Requisitos: **Node.js 22.11.0** y **npm 10 o superior**.

Desde la raíz del repositorio:

```bash
cd backend
npm ci
npm start
```

Para desarrollar con reinicio automático:

```bash
npm run start:dev
```

## Levantar con Docker

Requisitos: Docker Desktop con Docker Compose.

Desde la raíz del repositorio:

```powershell
docker compose up --build
```

Esto inicia la API y PostgreSQL, ejecuta las migraciones y deja disponible:

- API: http://localhost:3000
- PostgreSQL: localhost:5433
- Swagger: http://localhost:3000/docs
- Health: http://localhost:3000/health

Para detener los servicios:

```powershell
docker compose down
```

Los datos de PostgreSQL se conservan en el volumen `postgres_data`.
