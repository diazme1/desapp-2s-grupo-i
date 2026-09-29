# Quickstart: Autenticación del frontend

## Prerrequisitos

- Docker Desktop con Docker Compose.
- Node.js 22.11.0 o superior si se quiere ejecutar el frontend fuera de Docker.
- npm 10 o superior si se quiere ejecutar el frontend fuera de Docker.

## Levantar backend y frontend juntos

Desde la raíz del repositorio:

```powershell
docker compose up --build
```

Abrir el frontend en `http://localhost:5173`.

La API queda disponible en `http://localhost:3000` y Swagger en
`http://localhost:3000/docs`. El frontend usa el proxy `/api`; dentro de Compose, ese
proxy se dirige al servicio `api`.

Para detener los servicios:

```powershell
docker compose down
```

## Ejecutar el frontend localmente

Si el backend ya está levantado en Docker, en otra terminal ejecutar:

```powershell
cd frontend
npm ci
npm run dev
```

Abrir `http://localhost:5173`.

## Validación automatizada

Desde `frontend/`:

```powershell
npm test
npm run lint
npm run build
```

## Escenarios manuales

1. Abrir `/register`, enviar un correo válido y una contraseña de 8 o más caracteres.
2. Confirmar que el alta muestra un mensaje de éxito y ofrece ir a `/login`.
3. Repetir el registro con el mismo correo y comprobar el mensaje de conflicto.
4. Intentar registrar un correo inválido o contraseñas distintas y comprobar la validación local.
5. Iniciar sesión con credenciales válidas y comprobar el acceso a `/app`.
6. Recargar `/app` y comprobar que la sesión continúa activa.
7. Cerrar sesión y comprobar que `/app` vuelve a redirigir a `/login`.
8. Probar credenciales inválidas y verificar que no se revela si el correo existe.
9. Desconectar el backend, intentar iniciar sesión y comprobar el mensaje de indisponibilidad.
