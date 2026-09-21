# Quickstart: Catálogo de jugadores

## Prerrequisitos

- Node.js 22.11.x y npm 10 o superior.
- PostgreSQL disponible mediante Docker Compose o una instancia local.
- `DATABASE_URL` configurada en `backend/.env`.
- Dependencias instaladas con `npm install` desde `backend/`.

La feature no necesita credenciales de WhoScored ni conexión a un proveedor externo.

## Preparar la base local

Desde `backend/` ejecutar:

```powershell
npm install
npm run migration:run
```

La migración del catálogo crea las tablas y carga datos deterministas de las cinco
ligas requeridas.

## Levantar el backend

```powershell
npm run start:dev
```

La documentación interactiva queda disponible en:

```text
http://localhost:3000/docs
```

El contrato exportado se encuentra en:

[contracts/openapi.yaml](./contracts/openapi.yaml)

## Verificaciones manuales

### Listado sin filtros

```text
GET http://localhost:3000/players
```

Esperado: HTTP 200, objeto con `items` y `total`, jugadores activos ordenados por
nombre ascendente y luego por UUID.

### Listado filtrado

```text
GET http://localhost:3000/players?liga=premier-league&posicion=delantero
```

Esperado: HTTP 200 y solo jugadores que cumplen ambos filtros.

### Detalle

Tomar un UUID de `items` y ejecutar:

```text
GET http://localhost:3000/players/{id}
```

Esperado: HTTP 200 con el detalle sin `proveedor` ni `externalId`.

### Errores

- Filtro vacío, mayor a 100 caracteres o con formato inválido: HTTP 400 y mensaje en
  español.
- UUID inválido: HTTP 400 y mensaje en español.
- UUID válido pero inexistente o inactivo: HTTP 404.
- Filtro válido sin coincidencias: HTTP 200 con `items: []` y `total: 0`.

## Tests

Desde `backend/` ejecutar:

```powershell
npm run test:unit
npm run test:integration
npm run build
```

Los tests de integración deben usar PostgreSQL/Testcontainers y no deben requerir
WhoScored. Los tests unitarios del dominio no deben iniciar NestJS ni conectarse a
PostgreSQL.

## Postman

Importar:

```text
docs/postman/players.postman_collection.json
```

La colección debe incluir listado sin filtros, listado filtrado y detalle.
