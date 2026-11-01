# Contrato: `GET /users/{id}/portfolio`

## Request

```http
GET /users/<uuid>/portfolio
Authorization: Bearer <JWT>
```

El `id` debe ser UUID y coincidir con el `sub` del JWT. No hay body ni headers de escritura.

## Response `200`

```json
{
  "usuarioId": "<uuid>",
  "posiciones": [
    {
      "idJugador": "<uuid>",
      "cantidadTokens": 2,
      "cotizacionVigente": "15.00",
      "precioPromedioCompra": "11.00",
      "valorActual": "30.00",
      "gananciaPerdida": "8.00"
    }
  ]
}
```

La lista se ordena por `idJugador`. Los importes son strings con exactamente dos decimales.
Portfolio vacío devuelve `posiciones: []`; sin compras, `precioPromedioCompra` y
`gananciaPerdida` son `null`.

## Errores

- `401`: Bearer ausente, inválido o vencido.
- `403`: el usuario autenticado no es propietario del `id` solicitado.
- `404`: el usuario no existe.
- `409`: tenencia inconsistente con tokens o falta la cotización vigente de la estrategia activa.
- `422`: `id` no es un UUID válido.

Swagger debe publicar el Bearer, el parámetro UUID, los schemas de la respuesta y estos códigos.
La consulta no crea, actualiza ni elimina registros.
