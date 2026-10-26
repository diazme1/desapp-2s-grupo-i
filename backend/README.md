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

Copiá `.env.example` como `.env`, definí un `JWT_SECRET` de al menos 32 caracteres y generá
`CATALOG_REFRESH_API_KEY` con el módulo criptográfico nativo de Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

La API key operativa es una cadena base64url derivada de al menos 32 bytes aleatorios; la
configuración se valida sobre sus bytes UTF-8 y exige al menos 32 bytes. En ambientes no-test se
rechazan valores ausentes, vacíos, compuestos solo por espacios, con espacios laterales o iguales
a `change-me`, `changeme`, `your-api-key`, `your-secret`, `secret` o `test`. No guardes el valor
real en documentación ni en el repositorio.
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

Después de aplicar las migraciones, el primer inicio crea el superadmin compartido con correo
`admin@gmail.com` y contraseña `admin`, tomando los valores de `.env.example`; los siguientes
inicios no modifican la cuenta. El registro público siempre crea cuentas con rol `usuario` y no
permite elegir un rol. Si el correo ya pertenece a un usuario común, el backend se niega a
promoverlo y no inicia.

## Catálogo base de jugadores

Después de ejecutar las migraciones, el backend expone:

- `GET /players`: devuelve jugadores persistidos localmente y no consulta proveedores externos.
- `GET /players/:id`: devuelve el detalle por el UUID interno del jugador.
- `GET /players/:id/quotes`: devuelve el historial de cotizaciones del jugador, más reciente primero.
  Acepta `page` (por defecto `1`) y `limit` (por defecto `20`, máximo `100`).
- `GET /players/ranking?estrategia=ataque_decisivo|creacion_tecnica`: devuelve el ranking de la última corrida de esa estrategia, ordenado por cotización descendente. Si se omite el filtro, usa la estrategia activa; cambiarlo no recalcula.
- `POST /quotes/recalculate`: permite a un superadmin elegir `ataque_decisivo` o `creacion_tecnica`
  como estrategia activa y calcula ambas sincrónicamente desde las estadísticas locales. Las dos
  corridas se guardan juntas y se apunta a la elegida solo al completar todas las escrituras; una
  falla conserva la corrida activa anterior. Requiere
  `Authorization: Bearer <token>` de superadmin y no llama al scraper. Los pesos siguen el orden
  goles, asistencias, tiros, pases clave, regates, rating y faltas: ataque decisivo `35/25/20/5/5/5/5`,
  creación y técnica `5/15/5/30/25/15/5`; las faltas restan y los valores persistidos no se normalizan
  otra vez.
- Cada recálculo exitoso agrega ambas cotizaciones a `historial_cotizacion` y actualiza
  `cotizacion_vigente` (una fila por jugador y estrategia) dentro de la misma transacción. La tabla
  vigente conserva la corrida, estrategia y estadísticas usadas para cada valor actual.
- `POST /catalog/refresh?ligaCodigo=PL`: requiere un JWT Bearer y `X-API-Key` válidos e importa
  una liga, sus equipos y jugadores base desde Football-Data.org. La API key no se exige en las
  consultas de jugadores ni en los demás endpoints.

Para actualizar el catálogo, configurá `FOOTBALL_DATA_API_TOKEN` en el `.env` raíz. La URL,
las competencias y el intervalo entre requests se pueden revisar en `.env.example`. La
fuente externa se usa solo durante el refresh; si no está disponible, las lecturas locales
siguen funcionando. WhoScored y las estadísticas pertenecen a una segunda especificación.

En PowerShell, si se bloquea `npm.ps1`, usar `npm.cmd` en lugar de `npm`.
