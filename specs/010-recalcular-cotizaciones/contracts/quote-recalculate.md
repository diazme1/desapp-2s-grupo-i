# Contrato: `POST /quotes/recalculate`

- **Autorización**: JWT Bearer de `superadmin`; sin token `401`, rol común `403`.
- **Request**: `{ "estrategia": "ataque_decisivo" | "creacion_tecnica" }`.
- **200**: `{ idRecalculo, estrategia, estrategiasCalculadas, versionEstrategia, fechaHora, jugadoresCotizados, jugadoresSinEstadisticas }`.
- **Efecto**: calcula y persiste ambas estrategias en una operación síncrona desde la misma captura estadística. El body indica cuál estrategia queda activa. Agrega historial, actualiza `cotizacion_vigente` por jugador y estrategia y confirma todo junto. No llama al scraper.
- **Errores**: `422` por body/estrategia inválidos; error de persistencia revierte historial y cotizaciones vigentes parciales y conserva la corrida activa anterior.
- **OpenAPI**: contrato publicado en `/docs` y `/docs-json`.

## `GET /players/ranking`

- **Query opcional**: `estrategia=ataque_decisivo|creacion_tecnica`; si se omite, se consulta la estrategia activa.
- **Respuesta**: estrategia, ID/fecha de la última corrida y jugadores ordenados por cotización descendente.
- Cambiar el filtro solo lee cotizaciones vigentes; no dispara recálculos.
- Una estrategia todavía no calculada devuelve una lista vacía.
