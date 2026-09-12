# Football Player Market

## Descripción

Football Player Market es un mercado de tokens de jugadores de fútbol en el que el
rendimiento deportivo determina las cotizaciones históricas. Los usuarios autenticados
pueden comprar y vender una cantidad fija de tokens por jugador.

## Dominio del producto

### Jugadores y datos

- Los jugadores pertenecen a la Premier League, Bundesliga, La Liga, Serie A o Ligue 1.
- Las estadísticas se importan mediante Adapters reemplazables de proveedores externos.
- La información de jugadores y estadísticas se persiste localmente.
- El sistema debe continuar permitiendo lecturas locales cuando un proveedor externo no
  esté disponible.

### Cotizaciones

- Cada jugador tiene cotizaciones que evolucionan en el tiempo.
- Deben existir al menos dos estrategias de valuación configurables.
- Cada cotización registra la versión de estrategia utilizada y su fecha de vigencia.
- Una cotización debe poder reproducirse a partir de los datos almacenados, la configuración
  y la versión de estrategia utilizada.

### Mercado de tokens

- Cada jugador comienza con 100 tokens, propiedad de un único superusuario.
- En el momento inicial cada token vale 1 crédito.
- Los usuarios compran al precio vigente y solo pueden comprar tokens disponibles.
- Los usuarios venden únicamente tokens que poseen.
- Las operaciones actualizan el inventario, el saldo, la posición del usuario y el registro
  de la operación de forma consistente.

### Portfolio

El portfolio de cada usuario muestra:

- cantidad de tokens por jugador;
- precio promedio de compra;
- valor actual;
- ganancia o pérdida;
- historial de operaciones.

## Invariantes del dominio

1. El suministro total de tokens de cada jugador MUST ser siempre 100.
2. El dinero y las cotizaciones MUST utilizar aritmética exacta y MUST NOT depender de
   números de punto flotante.
3. Las operaciones de compra y venta MUST ser atómicas e idempotentes.
4. Las transacciones financieras y sus registros de auditoría MUST ser append-only.
5. Las cotizaciones históricas MUST insertarse y MUST NOT sobrescribirse.
6. Una falla del proveedor externo MUST NOT interrumpir las lecturas que puedan resolverse
   con datos locales o cacheados.
7. Las cotizaciones MUST ser reproducibles a partir de sus entradas almacenadas, la
   configuración y la versión de estrategia.

## Límites del contexto

Este documento describe el producto y sus reglas de dominio. Cada feature debe delimitar
qué parte implementa y debe respetar estas reglas. Las decisiones técnicas de cada entrega
se documentan en su `spec.md` y `plan.md`.
