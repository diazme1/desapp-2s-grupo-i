# Contrato: `POST /orders/sell`

## Request

```http
POST /orders/sell
Authorization: Bearer <JWT>
Idempotency-Key: sell-player-001
Content-Type: application/json

{
  "idJugador": "<uuid>",
  "cantidadTokens": 3
}
```

El vendedor debe ser un usuario común autenticado. El superadmin es el comprador implícito.
`Idempotency-Key` sigue las reglas ya implementadas para `buy` y no forma parte del body.

## Response `201`

La respuesta conserva el contrato de órdenes existente:

```json
{
  "idOperacion": "<uuid>",
  "idJugador": "<uuid>",
  "idComprador": "<superadmin-uuid>",
  "idVendedor": "<usuario-uuid>",
  "cantidadTokens": 3,
  "cotizacion": "10.00",
  "importe": "30.00",
  "estrategia": "<estrategia>",
  "idVersionEstrategia": "<uuid>",
  "fechaHora": "<timestamp>",
  "idempotencyKey": "sell-player-001"
}
```

## Errores

- `401`: Bearer ausente, inválido o vencido.
- `403`: identidad inexistente, rol no permitido o superadmin intentando vender.
- `404`: jugador inexistente.
- `409`: tenencia insuficiente, cotización activa ausente/inconsistente o clave reutilizada
  con otro actor, tipo o payload.
- `422`: body, UUID, cantidad o `Idempotency-Key` inválidos.

La falta de saldo del superadmin no produce `409`.

## Reglas internas

El importe es `cantidadTokens × cotización vigente`, con aritmética exacta. La operación
transfiere tokens individuales del usuario al superadmin y actualiza ambas tenencias en la
misma UoW. Un replay devuelve el snapshot persistido sin producir nuevos efectos.
