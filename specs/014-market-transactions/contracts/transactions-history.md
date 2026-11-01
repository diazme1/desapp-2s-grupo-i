# Contrato: `GET /users/:id/transactions`

## Request

```http
GET /users/{id}/transactions
Authorization: Bearer <JWT>
```

`id` debe ser un UUID y debe coincidir con el `sub` del JWT.

## Response `200`

```json
{
  "usuarioId": "<uuid>",
  "operaciones": [
    {
      "idOperacion": "<uuid>",
      "tipo": "COMPRA",
      "idJugador": "<uuid>",
      "nombreCompleto": "Lionel Andrés Messi",
      "cantidadTokens": 3,
      "cotizacion": "10.00",
      "importe": "30.00",
      "fechaHora": "2026-11-01T12:00:00.000Z"
    }
  ]
}
```

`importe` es el importe total persistido de la operación. `cotizacion` es el snapshot aplicado
por token. `nombreCompleto` proviene de `jugadores.nombre_completo` y puede ser `null` si el
catálogo no lo informa. La lista se ordena por `fecha_hora DESC, id_operacion ASC` y puede estar
vacía.

## Errores

| HTTP | Condición |
|---:|---|
| 401 | Bearer ausente, inválido o vencido |
| 403 | El usuario autenticado no coincide con el `id` solicitado |
| 404 | El UUID solicitado coincide con el `sub`, pero el usuario no existe |
| 409 | Snapshot persistido incompatible con las invariantes o el contrato |
| 422 | `id` no es un UUID válido |

## Exclusiones públicas

La respuesta no incluye saldo, portfolio, tenencias, cotizaciones actuales o históricas,
`idComprador`, `idVendedor`, `claveIdempotencia`, estrategia, versión, `idRecalculo` ni auditoría.
No se crean operaciones ni se modifican registros.
