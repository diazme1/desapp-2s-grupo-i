# Quickstart: Historial de operaciones de Mercado

## Prerrequisitos

- Node.js 22 y npm instalados.
- Dependencias del backend instaladas.
- Docker disponible para las pruebas de integración con PostgreSQL/Testcontainers.

## Validación automatizada

Desde `backend/`:

```bash
npm run test:unit -- --testPathPatterns=test/unit/market/transactions
npm run test:unit -- --testPathPatterns=test/unit/documentation/market/transactions-openapi.spec.ts
npm run test:integration -- --testPathPatterns=test/integration/market/transactions
npm run build
```

La integración debe ejecutar contra PostgreSQL real y preparar operaciones `COMPRA` y `VENTA`
usando el helper de órdenes existente. No debe agregar migraciones ni modificar los tests
existentes.

## Escenarios mínimos

1. Usuario autenticado con una compra y una venta: `200`, ambos registros y los ocho campos
   públicos, con `fechaHora DESC` e `idOperacion ASC` como desempate.
2. Usuario autenticado sin operaciones: `200` y `operaciones: []`.
3. JWT ausente/inválido: `401`; UUID ajeno: `403`; usuario propio inexistente: `404`; UUID
   inválido: `422`; fila incompatible: `409` sin historial parcial.
4. Comparar snapshots de `transacciones_mercado`, `auditorias_transaccion`, saldos, tokens,
   tenencias y cotizaciones antes y después: no debe haber cambios.
5. Consultar `/docs-json` y ejecutar la request de la carpeta nueva de Postman para verificar
   Bearer, schema y respuestas documentadas.

El contrato completo está en [contracts/transactions-history.md](contracts/transactions-history.md)
y el modelo de lectura en [data-model.md](data-model.md).
