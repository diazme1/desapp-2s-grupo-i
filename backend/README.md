# Backend — Desarrollo de Aplicaciones

Backend del trabajo práctico de **Desarrollo de Aplicaciones** de la
**Universidad Nacional de Quilmes (UNQ)**.

Tecnologías: **NestJS**, **TypeScript**, **Swagger/OpenAPI** y **Jest**.
La integración con **PostgreSQL** está pendiente.

## Levantar el backend

Requisitos: **Node.js 22.11.0** y **npm 10 o superior**.

Desde esta carpeta:

```bash
npm ci
npm start
```

Para desarrollar con reinicio automático:

```bash
npm run start:dev
```

- [Swagger](http://localhost:3000/docs)
- [Health](http://localhost:3000/health)

En PowerShell, si se bloquea `npm.ps1`, usar `npm.cmd` en lugar de `npm`.
