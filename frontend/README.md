# PlayerMarket - Frontend

Frontend de la aplicación de mercado de jugadores, construido con Vite, React y
TypeScript. Esta primera feature implementa registro, login, sesión autenticada y cierre
de sesión, con el diseño responsive de PlayerMarket.

## Desarrollo

Desde esta carpeta:

```powershell
npm install
npm run dev
```

Abrir `http://localhost:5173`.

## Docker

Desde la raíz del repositorio, el frontend se levanta junto con la API y PostgreSQL:

```powershell
docker compose up --build
```

Abrir `http://localhost:5173`. Dentro de Compose, Vite redirige `/api` al servicio
`api` en `http://api:3000`.

Vite utiliza `/api` como base local y lo redirige al backend en `http://localhost:3000`.
Se puede cambiar mediante `VITE_API_BASE_URL`; copiar `.env.example` a `.env.local` si
se necesita otra URL.

## Validación

```powershell
npm test
npm run lint
npm run build
```

Rutas disponibles:

- `/login`: inicio de sesión.
- `/register`: creación de cuenta.
- `/app`: pantalla protegida provisional.

La sesión se conserva en `sessionStorage` durante la vida de la pestaña. No se guardan
contraseñas ni se implementan refresh tokens en esta feature.
