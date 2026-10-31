# Quickstart de validación: venta de tokens

## Prerrequisitos

- Docker disponible para PostgreSQL/Testcontainers.
- Configuración local del backend y superadmin compartido.
- Migraciones aplicadas, catálogo inicializado y cotización vigente disponible.

## Validación automatizada

Desde `backend/`:

```bash
npm run build
npm run test:unit
npm run test:integration -- --testPathPatterns=test/integration/orders
npm run lint
```

Los tests deben cubrir venta parcial y total, saldo negativo del superadmin, idempotencia,
rollback, concurrencia con compra y recálculo, y migración de compras existentes.

La validación de implementación ejecutada durante esta feature confirmó `npm run build`,
`npm run lint` y las suites unitarias de la feature. La suite unitaria conserva un fallo
preexistente y ajeno a Mercado en `test/unit/documentation/quote-history-openapi.spec.ts`,
causado por la restricción del entorno para escuchar `0.0.0.0`. Las suites de integración
Testcontainers requieren un runtime Docker disponible; si no está iniciado, deben ejecutarse
en el entorno CI o local correspondiente antes de considerar cerrada la validación de
PostgreSQL.

## Validación HTTP

1. Registrar o iniciar sesión como usuario común.
2. Obtener un jugador inicializado con tokens en la tenencia del usuario.
3. Consultar una cotización de la estrategia activa.
4. Ejecutar `POST /orders/sell` usando el contrato de [sell-order.md](contracts/sell-order.md).
5. Verificar respuesta `201`, transferencia de tokens, tenencias, saldo del usuario y saldo
   posiblemente negativo del superadmin.
6. Repetir la petición con la misma clave y payload; debe devolver el mismo `idOperacion` sin
   duplicar efectos.
7. Repetir la clave con otra cantidad; debe responder `409` sin cambios.

La colección `docs/postman/market-orders.postman_collection.json` debe conservar los casos de
compra existentes y agregar venta, replay y error de clave incompatible.

## Verificaciones de integridad

- Cada jugador conserva exactamente 100 tokens.
- Cada token tiene un único propietario.
- Las tenencias coinciden con el conteo de tokens.
- La transacción común tiene `tipo = VENTA` y una única auditoría.
- No se consulta el historial como fuente de precio.
- Una falla de persistencia no deja cambios parciales.
- `trg_saldos_usuario_rol_integridad` permite saldo negativo solo al superadmin y rechaza con
  error de integridad cualquier saldo negativo de un usuario común.
