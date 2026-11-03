# Research: Comprar tokens de jugador

## Data source y atomicidad

**Decisión**: Ejecutar la compra sobre `PLAYERS_DATA_SOURCE`, ampliando su lista de entidades
con `SaldoUsuarioEntity` y las entidades de órdenes. El módulo no usará `USER_REPOSITORY` dentro
de la compra.

**Rationale**: `UsersModule` crea otra conexión; mezclarla con tokens, tenencias y cotizaciones
impediría una transacción única. `PLAYERS_DATA_SOURCE` ya contiene jugadores, usuarios, quotes,
tokens y tenencias.

**Alternativas consideradas**: crear un datasource de órdenes o coordinar dos transacciones; se
descartan porque duplican infraestructura y permiten estados parciales.

## Fuente de cotización

**Decisión**: Bloquear `recalculo_cotizacion_activo`, obtener su estrategia y recálculo, y
bloquear la fila de `cotizacion_vigente` del jugador con ambas referencias. Leer `cotizacion::text`
y convertir a `Cotizacion`.

**Rationale**: el ranking permite filtros alternativos y no bloquea; no representa la fuente
transaccional de una compra. El historial es trazabilidad y no precio aplicable.

**Alternativas consideradas**: consultar `historial_cotizacion`, usar el ranking o tomar la última
fila de cualquier estrategia; todas se descartan porque pueden usar un precio no activo o no
coherente con el puntero de estrategia.

## Orden y concurrencia

**Decisión**: Mantener un orden fijo: clave de idempotencia, puntero activo, jugador, cotización,
usuarios, saldos, tokens, tenencias y registros. Reintentar `40001` y `40P01` hasta tres veces.

**Rationale**: el recálculo ya bloquea el puntero activo; compartir ese lock serializa el cambio
de estrategia con la lectura del precio. El jugador serializa compras del mismo suministro.

**Alternativas consideradas**: confiar solo en checks posteriores o usar transacciones separadas;
no garantizan que dos compras vean la misma disponibilidad ni evitan movimientos parciales.

## Idempotencia

**Decisión**: `Idempotency-Key` obligatorio, lock transaccional por clave, restricción `UNIQUE` y
snapshot de comprador, jugador y cantidad en la orden. Una coincidencia devuelve el resultado
persistido; una reutilización diferente responde conflicto.

**Rationale**: cubre reintentos después de un timeout sin duplicar transferencias, aun cuando la
respuesta original se haya perdido.

**Alternativas consideradas**: aceptar la clave solo en el body o deduplicar en memoria; se
descartan por acoplar el protocolo al payload o perder la garantía al reiniciar el proceso.

## Append-only

**Decisión**: `ordenes_compra` y `auditorias_orden_compra` solo se insertan; la migración agrega
triggers que rechazan `UPDATE` y `DELETE`, además de no exponer métodos de edición en el
repository.

**Rationale**: la inmutabilidad queda protegida por la base y por la aplicación, no solo por una
convención del service.

**Alternativas consideradas**: proteger únicamente desde TypeScript; no alcanza para escrituras
directas o errores de infraestructura.

## Exactitud financiera

**Decisión**: guardar cotización en `numeric(14,2)`, importe en unidades mínimas `bigint` y
exponer ambos como strings con dos decimales. Reutilizar `Cotizacion` y `Creditos`.

**Rationale**: los value objects ya rechazan negativos y evitan punto flotante en el dominio; el
transformer de `HistorialCotizacionEntity` aporta la convención exacta.

**Alternativa considerada**: `number` en el caso de uso; se descarta por pérdida de precisión.

## Verificación de integración

**Decisión**: agregar un helper Testcontainers específico de órdenes y tests nuevos sin editar
los helpers o specs existentes.

**Rationale**: los fixtures actuales enumeran migraciones y tablas explícitamente; una suite
aislada puede incluir la migración nueva y resetear solo su propia base.

**Alternativa considerada**: modificar el helper compartido existente; se descarta por la regla
de protección de tests existentes y para no alterar su alcance.
