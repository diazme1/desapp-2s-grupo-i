# Backend — Desarrollo de Aplicaciones

Backend del trabajo práctico de **Desarrollo de Aplicaciones** de la
**Universidad Nacional de Quilmes (UNQ)**.

Tecnologías: **NestJS**, **TypeScript**, **Swagger/OpenAPI**, **Jest**, **PostgreSQL/TypeORM** y **JWT**.

## Levantar el backend

Requisitos: **Node.js 22.11.0** y **npm 10 o superior**.

Desde esta carpeta:

```bash
npm ci
npm start
```

Copiá `.env.example` como `.env` y definí un `JWT_SECRET` de al menos 32 caracteres.
`DATABASE_URL` es opcional para desarrollo: si no está definida se usa un repositorio en memoria;
con PostgreSQL configurado se utilizan las migraciones.

```powershell
Copy-Item .env.example .env
npm.cmd run migration:run
```

Para desarrollar con reinicio automático:

```bash
npm run start:dev
```

- [Swagger](http://localhost:3000/docs)
- [Health](http://localhost:3000/health)
- `POST /auth/register` para crear una cuenta.
- `POST /auth/login` para obtener un JWT Bearer.
- `GET /auth/me` requiere `Authorization: Bearer <token>`.

En PowerShell, si se bloquea `npm.ps1`, usar `npm.cmd` en lugar de `npm`.
