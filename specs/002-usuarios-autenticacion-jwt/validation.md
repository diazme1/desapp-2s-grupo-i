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
`DATABASE_URL` es obligatoria para los tests de integración y el desarrollo local. Configurá `.env`
con PostgreSQL disponible y ejecutá `npm.cmd run migration:run`.

Testcontainers no pudo ejecutarse en este entorno porque el daemon de Docker no estaba iniciado.
La integración HTTP requiere Docker/PostgreSQL disponible para ejecutar la migración y la prueba.

## Revisión manual

- Swagger: `http://localhost:3000/docs`, con esquema `bearerAuth` en `GET /auth/me`.
- `/health` responde sin autenticación.
- No se registran contraseñas, secretos ni tokens completos.
