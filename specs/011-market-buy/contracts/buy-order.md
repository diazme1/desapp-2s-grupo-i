# Contrato: `POST /orders/buy`

## Contrato público

- **Autorización**: `Authorization: Bearer <JWT>`; el `sub` debe identificar un usuario común
  existente. El superadmin no puede comprarse sus propios tokens.
- **Idempotencia**: header obligatorio `Idempotency-Key`; no forma parte del body. El
  `IdempotencyKeyPipe` de entrada recorta sus espacios laterales, valida el valor normalizado de
  1–128 caracteres ASCII de `[A-Za-z0-9._~-]` y devuelve `422` ante cualquier error. Se persiste y
  compara siempre normalizado.
- **Request**:

```http
POST /orders/buy
Authorization: Bearer <token>
Idempotency-Key: buy-player-001
Content-Type: application/json

{
  "idJugador": "<uuid>",
  "cantidadTokens": 3
}
```

`BuyOrderDto` valida exclusivamente el body. `OrdersController` aplica declarativamente
`IdempotencyKeyPipe`, recibe la clave normalizada y delega en `OrdersService` sin implementar
trimming, regex, límites ni decisiones de negocio.

- **Response `201`**: `idOperacion`, `idJugador`, `idComprador`, `idVendedor`,
  `cantidadTokens`, `cotizacion`, `importe`, `estrategia`, `idVersionEstrategia`, `fechaHora` e
  `idempotencyKey`. `cotizacion` e `importe` son strings con dos decimales.
- **Replay**: la misma clave, comprador, jugador y cantidad devuelve la operación persistida sin
  repetir efectos.
- **Errores**:
  - `401`: Bearer ausente, inválido o vencido.
  - `403`: comprador inexistente en la identidad persistida, superadmin como comprador o rol no
    permitido.
  - `404`: jugador inexistente.
  - `409`: estrategia/cotización no disponible, saldo insuficiente, tokens insuficientes o clave
    reutilizada con otro contenido.
  - `422`: body, UUID, cantidad o `Idempotency-Key` inválidos, ausentes, vacíos, con espacios
    internos, controles, caracteres no permitidos o más de 128 caracteres luego del recorte.

## `IdempotencyKeyPipe`

1. Leer exclusivamente el header y recortar espacios laterales.
2. Rechazar con `422` si el valor normalizado tiene longitud menor a 1 o mayor a 128, o contiene
   caracteres fuera de `[A-Za-z0-9._~-]`.
3. Retornar el valor normalizado al Controller. Un rechazo no modifica tokens, tenencias, saldos,
   órdenes ni auditorías.

El `OrdersService` y `OrdenCompra` comparan la clave normalizada con la orden existente: una
coincidencia de payload produce replay y una reutilización con datos diferentes produce `409`.
El repository solo consulta, persiste y aplica `UNIQUE`.

## Contrato interno de cotización

```text
resolverCotizacionVigente(jugadorId): ActiveQuoteSnapshot | ausencia

ActiveQuoteSnapshot = {
  estrategia,
  idVersionEstrategia,
  idRecalculo,
  cotizacion: Cotizacion,
  fechaHora
}
```

Precondición: se ejecuta dentro de la UoW de compra.

1. Bloquea `recalculo_cotizacion_activo(id = 1)`.
2. Devuelve ausencia si falta la fila o si `tipo_estrategia`/`id_recalculo` son nulos; `OrdenCompra`
   convierte esa ausencia en el error de negocio correspondiente.
3. Bloquea `cotizacion_vigente` por jugador y estrategia activa.
4. Devuelve ausencia si falta la fila o si su `id_recalculo` no coincide con el puntero activo;
   `OrdenCompra` decide la inviabilidad sin fallback.
5. Lee `cotizacion::text`, la convierte a `Cotizacion` y devuelve el snapshot.

No puede consultar `historial_cotizacion`, otra estrategia, el ranking ni calcular un precio.

## Contrato interno de persistencia

La UoW debe ofrecer una transacción que permita, en orden, tomar el lock de idempotencia, bloquear
estrategia/jugador/cotización, cargar usuarios y saldos, seleccionar tokens del superadmin,
bloquear tenencias, invocar `OrdenCompra` y persistir sus mutaciones y la orden/auditoría. Toda
excepción revierte la UoW. Solo `40001` y `40P01` son reintentables. El repository no decide si la
compra es válida: carga, bloquea, mapea y persiste; el dominio valida y ejecuta.
