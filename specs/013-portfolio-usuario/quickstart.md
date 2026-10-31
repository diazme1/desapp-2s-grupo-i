# Quickstart: Portfolio de usuario

## Prerrequisitos

- Node.js y dependencias del backend instaladas.
- Docker disponible para PostgreSQL/Testcontainers.
- Variables de entorno del backend configuradas según el proyecto.

## Validación

Desde `backend/`:

```bash
npm run build
npm test -- --runInBand test/unit/portfolio test/unit/documentation/portfolio-openapi.spec.ts
npm test -- --runInBand test/integration/portfolio/portfolio.spec.ts
```

También importar `docs/postman/football-player-market.postman_collection.json`, iniciar sesión
como usuario común, guardar su `userId` y ejecutar la request autenticada de portfolio.

## Escenarios esperados

1. Usuario con tenencia y compras: `200`, posiciones ordenadas y cálculos exactos.
2. Usuario sin tenencias positivas: `200` con `posiciones: []`.
3. Cotización histórica diferente: el valor usa solo la fila vigente de la estrategia activa.
4. Sin compras: promedio y ganancia `null`.
5. Tenencia inconsistente o cotización vigente ausente: `409` sin respuesta parcial.
6. JWT ausente, ownership ajeno, usuario inexistente o UUID inválido: `401`, `403`, `404` o
   `422`, respectivamente.

Los tests de integración comparan antes y después tokens, tenencias, cotizaciones y transacciones
para comprobar que la consulta no produce escrituras.
