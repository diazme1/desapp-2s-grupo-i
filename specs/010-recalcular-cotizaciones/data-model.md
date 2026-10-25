# Datos

- **EstadísticasJugador**: agrega `fecha_captura`; la fila más reciente por jugador es la entrada del cálculo.
- **VersiónEstrategia**: UUID, tipo, versión, pesos JSONB y creación; inmutable y única por tipo/versión.
- **RecalculoCotizacion**: UUID, versión utilizada, inicio/fin y cantidad procesada.
- **RecalculoActivo**: fila singleton que apunta a la corrida y estrategia elegidas para compras/ventas.
- **HistorialCotizacion**: tabla existente; una fila por jugador y estrategia con estadísticas, versión y corrida usadas. Solo inserciones.
- **CotizacionVigente**: una fila por jugador y estrategia con el último valor exitoso y sus referencias a estadísticas, versión y corrida; se reemplaza por upsert dentro del recálculo.

Ambas estrategias se calculan desde la misma captura estadística. La actualización de corridas, historial, cotizaciones vigentes y estrategia activa se confirma en una sola transacción PostgreSQL.
