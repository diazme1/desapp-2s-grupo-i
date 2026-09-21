# Backend — Desarrollo de Aplicaciones

Backend del trabajo práctico de **Desarrollo de Aplicaciones** de la
**Universidad Nacional de Quilmes (UNQ)**.

Tecnologías: **NestJS**, **TypeScript**, **Swagger/OpenAPI**, **Jest**, **PostgreSQL/TypeORM** y **JWT**.

## Levantar el backend

Requisitos: **Node.js 22.11.0** y **npm 10 o superior**.

Desde esta carpeta:

```bash
npm ci
```

Copiá `.env.example` como `.env` y definí un `JWT_SECRET` de al menos 32 caracteres.
`DATABASE_URL` es obligatoria y debe apuntar a una instancia PostgreSQL disponible.
La aplicación utiliza las migraciones para crear su esquema de persistencia.

```powershell
Copy-Item .env.example .env
npm.cmd run migration:run
npm.cmd start
```

Para desarrollar con reinicio automático:

```bash
npm run start:dev
```

- [Swagger](http://localhost:3000/docs)

En PowerShell, si se bloquea `npm.ps1`, usar `npm.cmd` en lugar de `npm`.
