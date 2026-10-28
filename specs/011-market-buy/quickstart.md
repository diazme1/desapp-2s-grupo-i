# Quickstart: validar compra de tokens

## Prerrequisitos

- Node.js 22.11 y npm 10+.
- Docker disponible para PostgreSQL/Testcontainers.
- Dependencias instaladas desde `backend/` con `npm ci`.
- Configuración de `DATABASE_URL`, `JWT_SECRET`, `CATALOG_REFRESH_API_KEY`,
  `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD` según `backend/.env.example`.

El entorno debe iniciar el superadmin sin saldo inicial especial. Un usuario común se registra
por `POST /auth/register` y conserva el saldo inicial existente.

## Verificación automatizada

Desde `backend/`:

```bash
npm run build
npm test -- --runInBand --testPathPatterns=test/unit/orders
npm test -- --runInBand --testPathPatterns=test/integration/orders
npm test -- --runInBand test/unit/documentation/orders-openapi.spec.ts
```

Los tests de integración levantan PostgreSQL 16 en Testcontainers, ejecutan las migraciones
existentes y `1790275843000-CreateOrdenesCompra`, y no reutilizan ni modifican helpers de tests
existentes.

`Idempotency-Key` llega únicamente como header: se recortan espacios laterales y el valor
normalizado debe tener 1–128 caracteres ASCII de `[A-Za-z0-9._~-]`. Los valores ausentes, vacíos,
con espacios internos, controles o caracteres inválidos responden `422` sin efectos.

## Escenarios mínimos

1. Inicializar un jugador con 100 tokens del superadmin y una cotización vigente de la estrategia
   activa.
2. Registrar un usuario común y autenticarlo.
3. Enviar la request de [buy-order.md](contracts/buy-order.md) con `Idempotency-Key` nuevo.
4. Verificar `201`, strings exactos de cotización/importe, tokens transferidos, tenencias,
   débito del comprador, acreditación del superadmin y una orden/auditoría.
5. Repetir la misma request con la misma clave y verificar el mismo resultado sin efectos nuevos.
6. Repetir con saldo insuficiente, cantidad inválida, jugador inexistente, falta de cotización,
   falta de disponibilidad, superadmin como comprador, clave con payload diferente y cada variante
   inválida del header; verificar el código correspondiente y estado intacto.
7. Ejecutar compras concurrentes y verificar que la suma de tokens continúa en 100, no hay saldo
   negativo y solo se confirman cantidades disponibles.
8. Preparar estrategia y cotización activa iniciales, iniciar compra y recálculo concurrentes
   sobre el mismo jugador mediante una barrera controlada o lock de coordinación del test, sin
   esperas arbitrarias; aceptar cualquiera de los dos órdenes de commit y verificar snapshot
   completo, operación, cotización activa final, una sola transferencia, saldos no negativos y
   tenencias consistentes.
9. Provocar un error de persistencia y verificar rollback de tokens, tenencias, saldos, orden y
   auditoría.

## Documentación manual

- Abrir `/docs` y confirmar `POST /orders/buy`, Bearer, `Idempotency-Key`, schemas y errores.
- Ejecutar `docs/postman/market-orders.postman_collection.json`: login de usuario, compra,
  replay idempotente y aserciones del response.
