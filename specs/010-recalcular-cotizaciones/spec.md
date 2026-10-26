# Especificación: Recalcular cotizaciones

**Rama**: `feature/recalcular-cotizaciones` · **Fecha**: 2026-10-22 · **Estado**: Implemented

## Historia y aceptación

### US1 — Recalcular cotizaciones (P1)

Como superadmin, quiero recalcular ambas estrategias desde las estadísticas guardadas y elegir cuál queda activa para operaciones de compra/venta.

- `POST /quotes/recalculate` acepta `ataque_decisivo` o `creacion_tecnica`; calcula ambas estrategias en una operación síncrona y deja activa la elegida.
- Procesa el registro más reciente por jugador con estadísticas; omite jugadores sin registro.
- El éxito agrega historial para ambas estrategias y actualiza una cotización vigente por jugador y estrategia.
- La operación activa la estrategia elegida solo al guardar todo correctamente. Una falla revierte las dos corridas y conserva el estado previo.
- `GET /players/ranking?estrategia=...` consulta el último resultado de cualquiera de las dos estrategias; sin filtro usa la activa. Cambiar el filtro no recalcula.
- Sin token responde `401`; un usuario común recibe `403`; una estrategia inválida recibe `422`.
- No consulta el scraper ni depende de un scheduler.
- El superadmin compartido se crea al iniciar desde la configuración de ejemplo; el registro público sigue creando usuarios comunes.

## Requisitos

- **FR-001**: Aceptar únicamente las dos estrategias v1. Pesos en orden goles, asistencias, tiros, pases clave, regates, rating y faltas: ataque decisivo `35/25/20/5/5/5/5`; creación y técnica `5/15/5/30/25/15/5`.
- **FR-002**: Calcular `max(0, redondeo a 2 decimales de 1 + Σ(métrica × peso)/100)`. Los nulos aportan cero y las faltas restan. No volver a normalizar los valores persistidos.
- **FR-003**: Guardar una cotización append-only por jugador elegible y estrategia, con procedencia a su versión, corrida y estadísticas utilizadas.
- **FR-004**: Persistir ambas corridas y activar la estrategia elegida solo dentro de la transacción que guarda correctamente todas las cotizaciones; ante error, mantener el estado activo anterior.
- **FR-005**: Permitir recálculo solo a superadmins. El registro común conserva el rol `usuario`.
- **FR-006**: Documentar request, respuesta, autorización y errores en OpenAPI y Postman.
- **FR-007**: Provisionar idempotentemente `admin@gmail.com` con contraseña `admin` desde el bootstrap compartido y permitir su inicio de sesión.
- **FR-008**: Mantener en `cotizacion_vigente` una fila por jugador y estrategia del último recálculo exitoso, con fecha, valor y referencias de procedencia; actualizarla atómicamente con el historial y la estrategia activa.
- **FR-009**: Generar ambas estrategias en cada POST y mantener una fila vigente por jugador y estrategia.
- **FR-010**: Permitir que el ranking consulte una estrategia por GET; si no se indica, usar la estrategia activa.

## Bordes

- Sin jugadores con estadísticas, la corrida termina con cero cotizaciones y puede activarse correctamente.
- Valores nulos se tratan como cero; un resultado negativo queda en cero.
- Si falla cualquier escritura de la corrida, no queda historial parcial ni cambia la corrida activa.

## Entidades

- **Versión de estrategia**: nombre, número de versión, pesos inmutables y fecha de creación.
- **Corrida**: estrategia usada, inicio/fin y cantidad de cotizaciones.
- **Corrida activa**: referencia única a la corrida exitosa de la estrategia elegida.
- **Cotización histórica**: jugador, estrategia, cotización, fecha y referencias de procedencia.
- **Cotización vigente**: una fila por jugador y estrategia con su última cotización exitosa y referencias de procedencia.
- **Estadísticas**: métricas persistidas y fecha de captura.

## Éxito

- **SC-001**: Una petición procesa sincrónicamente los jugadores elegibles y solo responde éxito al terminar todas las escrituras.
- **SC-002**: Una falla deja intactos la corrida activa, el historial previo y las cotizaciones vigentes.
- **SC-003**: Solo un JWT de superadmin puede iniciar la operación.
- **SC-004**: Una instalación configurada con `.env.example` permite iniciar sesión como el superadmin compartido sin registrarlo manualmente.

## Supuestos

- La base es 1 crédito y la escala de pesos es 1/100; se redondea a centavos con aritmética decimal exacta.
- Las tasas decimales existentes (hasta dos cifras) se usan como fueron guardadas. Filas anteriores a `fecha_captura` reciben la fecha de migración; no es posible reconstruir su captura real.
- La estrategia activa determina compras/ventas futuras; el ranking puede filtrar la otra estrategia sin cambiar ese estado.
