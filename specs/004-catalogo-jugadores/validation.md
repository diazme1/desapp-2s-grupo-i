# Validación: Catálogo de jugadores

## Estado

La implementación compila y los tests unitarios pasan. Los tests de integración
quedan pendientes de ejecutarse con PostgreSQL disponible.

## Comandos ejecutados

Desde `backend/`:

| Comando | Resultado |
|---|---|
| `npm.cmd install` | PASS; dependencias instaladas desde `package-lock.json` |
| `npm.cmd run test:unit` | PASS; 15 suites y 48 tests |
| `npm.cmd run build` | PASS |
| `npm.cmd run lint` | PASS; 0 warnings y 0 errors |
| Validación JSON de `docs/postman/players.postman_collection.json` | PASS |
| `npm.cmd run test:integration` | BLOQUEADO; no se pudo autenticar contra PostgreSQL disponible |

## Motivo del bloqueo de integración

El helper de integración requiere una base PostgreSQL accesible mediante
`DATABASE_URL`. Se intentó usar la URL del `docker-compose.yml`:

```text
postgres://postgres:postgres@localhost:5433/football_market
```

La conexión a `localhost:5433` devolvió `ECONNREFUSED` porque Docker Desktop no tenía
disponible el engine Linux. También se probó `localhost:5432`, donde hay un servicio
PostgreSQL local, pero rechazó la contraseña `postgres` del entorno de pruebas.
No se modificaron tests existentes ni se simuló el resultado de integración.

## Pendiente

Con Docker/Testcontainers disponible, o con un PostgreSQL local configurado con las
credenciales esperadas, ejecutar:

```powershell
$env:DATABASE_URL='postgres://postgres:postgres@localhost:5433/football_market'
$env:JWT_SECRET='test-secret-with-at-least-32-characters'
npm.cmd run test:integration
```

Luego verificar Swagger en `/docs`, ejecutar la colección
`docs/postman/players.postman_collection.json` y completar los resultados HTTP de
`GET /players` y `GET /players/:id`.
