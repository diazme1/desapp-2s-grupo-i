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
- [Health](http://localhost:3000/health)
- `POST /auth/register` para crear una cuenta.
- `POST /auth/login` para obtener un JWT Bearer.
- `GET /auth/me` requiere `Authorization: Bearer <token>`.

## Catálogo base de jugadores

Después de ejecutar las migraciones, el backend expone:

- `GET /players`: devuelve jugadores persistidos localmente y no consulta proveedores externos.
- `GET /players/:id`: devuelve el detalle por el UUID interno del jugador.
- `POST /catalog/refresh`: requiere un JWT Bearer e importa únicamente ligas, equipos y
  jugadores base desde Football-Data.org.

Para actualizar el catálogo, configurá `FOOTBALL_DATA_API_TOKEN` en `.env`. La URL, las
competencias (`PL,BL1,PD,SA,FL1`) y la fuente se pueden revisar en `.env.example`. La
fuente externa se usa solo durante el refresh; si no está disponible, las lecturas locales
siguen funcionando. WhoScored y las estadísticas pertenecen a una segunda especificación.

En PowerShell, si se bloquea `npm.ps1`, usar `npm.cmd` en lugar de `npm`.
