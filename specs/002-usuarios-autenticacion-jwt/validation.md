# Validación: usuarios y autenticación JWT

## Verificaciones ejecutadas

Desde `backend/`:

| Comando | Resultado |
| --- | --- |
| `npm.cmd run build` | OK |
| `npm.cmd run test:unit` | 9 suites, 32 tests OK |
| `npm.cmd run test:integration` | 4 suites, 16 tests OK |

Las pruebas cubren normalización y validación, registro, duplicados, hash, login, emisión de
JWT, rechazo de tokens ausentes o inválidos, `/auth/me` y `/health` público. Las respuestas de
usuario no contienen `password` ni `passwordHash`.

## Persistencia

La migración `backend/migrations/1710000000000-CreateUsuarios.ts` crea la tabla `usuarios`.
Cuando `DATABASE_URL` no está definida, los tests y el desarrollo local usan el repositorio en
memoria. Para PostgreSQL, configurar `.env` y ejecutar `npm.cmd run migration:run`.

Testcontainers no pudo ejecutarse en este entorno porque el daemon de Docker no estaba iniciado.
La integración HTTP funciona con el fallback en memoria; antes de una entrega con PostgreSQL se
debe repetir la migración y la prueba con Docker/PostgreSQL disponible.

## Revisión manual

- Swagger: `http://localhost:3000/docs`, con esquema `bearerAuth` en `GET /auth/me`.
- `/health` responde sin autenticación.
- No se registran contraseñas, secretos ni tokens completos.
