# Historial de cotizaciones por jugador

**Branch**: `feature/historial-cotizaciones` · **Fecha**: 2026-10-22

## Alcance

Implementar `GET /players/:id/quotes` y provisionar el superadmin inicial. No incluye cálculo o recálculo de cotizaciones, ranking ni scraper.

## Historias

### US1 — Consultar historial (P1)

Como consumidor del catálogo, quiero consultar las cotizaciones anteriores de un jugador.

- Jugador existente: devuelve historial paginado, más reciente primero.
- Sin cotizaciones: devuelve lista vacía; jugador inexistente: `404`.
- UUID o paginación inválidos: `422`.
- `page` inicia en 1; `limit` inicia en 20 y admite 1–100.

### US2 — Provisionar superadmin (P1)

Como operador, quiero configurar una cuenta superadmin inicial sin permitir que el registro público otorgue privilegios.

- `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD` se configuran juntos.
- El bootstrap crea la cuenta una vez, almacena el hash y no promueve usuarios comunes.
- El registro normal asigna el rol `usuario`.

## Requisitos

- **FR-001**: El historial devuelve `items`, `page`, `limit`, `total` y `totalPages`; cada item incluye cotización, fecha, estrategia y referencias de procedencia.
- **FR-002**: Ordenar por fecha descendente y desempatar por ID descendente.
- **FR-003**: Validar UUID, página y límite según las reglas anteriores.
- **FR-004**: Documentar el endpoint en Swagger y en la colección Postman.
- **FR-005**: Crear el superadmin solo desde configuración operacional, de forma idempotente y con contraseña hasheada.
- **FR-006**: Nunca elevar automáticamente una cuenta existente ni permitir elegir el rol en el registro.

## Criterios de aceptación

1. Se distinguen historial con datos, historial vacío, jugador inexistente y parámetros inválidos.
2. La paginación permite recorrer todo el historial en orden estable.
3. Inicios repetidos no duplican el superadmin y el registro público mantiene rol común.

## Supuestos y límites

- La lectura conserva el acceso público de los endpoints del catálogo.
- Se consultan cotizaciones ya persistidas; esta feature no las genera.
- La versión de estrategia y el recálculo se conservan como referencias; su escritura queda para otra feature.
