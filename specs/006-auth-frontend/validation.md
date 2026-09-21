# Validation: Autenticación del frontend

## Automatizada

Ejecutado desde `frontend/`:

- `npm test`: PASS - 4 archivos, 12 tests.
- `npm run lint`: PASS - sin errores.
- `npm run build`: PASS - bundle de producción generado por Vite.
- `npm run dev -- --host 127.0.0.1` + `GET /login`: PASS - el servidor respondió HTTP 200.
- `docker compose config`: PASS - Compose resuelve `postgres`, `api` y `frontend`, con el
  proxy del frontend apuntando a `http://api:3000`.

## Cobertura funcional automatizada

- Registro válido y normalización del correo.
- Validación de confirmación de contraseña.
- Conflicto de correo existente.
- Login válido y navegación a la ruta protegida.
- Credenciales inválidas con mensaje genérico.
- Uso de Bearer para `/auth/me`.
- Recuperación de sesión desde `sessionStorage`.
- Expulsión ante 401 y cierre de sesión.

## Validación visual

- PASS - composición responsive revisada en navegador con viewport mobile.
- PASS - header, formulario y footer renderizados sin errores de consola.
- PASS - login y registro mantienen el formulario centrado y permiten navegar entre sí.

## Validación manual pendiente

Los escenarios que requieren backend y navegador deben ejecutarse siguiendo
[quickstart.md](quickstart.md), con PostgreSQL y la API levantados. La suite automatizada
no reemplaza la prueba de conexión real contra `http://localhost:3000`.

En este entorno, Docker Desktop no permitió acceder al motor PostgreSQL, por lo que queda
pendiente probar el flujo completo contra la API real.

También queda pendiente ejecutar `docker compose up --build` completo en una máquina con
Docker Desktop iniciado y su motor disponible.
