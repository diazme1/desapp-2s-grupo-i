# Contrato: `GET /players/{id}/quotes`

- **Path**: `id` UUID de jugador.
- **Query**: `page` entero >=1 (default 1); `limit` entero 1–100 (default 20).
- **200**: `{ items, page, limit, total, totalPages }`. Los items incluyen IDs de cotización/jugador/estadística/estrategia/recálculo, `fechaHora`, `cotizacion` y `tipoEstrategia`.
- **Orden**: `fechaHora DESC`, luego `id DESC`.
- **Vacío**: jugador existente sin cotizaciones devuelve `items: []`, `total: 0`, `totalPages: 0`.
- **Errores**: `404` jugador inexistente; `422` UUID o paginación inválidos.
- OpenAPI: `/docs` y `/docs-json`.
