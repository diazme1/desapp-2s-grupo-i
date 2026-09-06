# Modelo de datos: app base

No hay entidades de dominio, relaciones, persistencia ni transiciones de estado.
La salud describe disponibilidad del proceso, no el estado de una base o proveedor.

## Respuesta técnica HealthResponseDto

| Campo | Tipo | Regla |
|-------|------|-------|
| status | string | Obligatorio; único valor permitido: ok. |

No admite campos adicionales en la respuesta del endpoint. El Service produce el estado;
el DTO documenta la representación HTTP y no se introduce como dependencia del dominio.
Ver [contrato OpenAPI](contracts/openapi.yaml).

## Configuración de proceso

PORT es una variable de entorno, no un campo del dominio ni un DTO de request.
Ausente: 3000. Presente: representación decimal de entero entre 1 y 65535.
Vacío, texto, cero, negativos, decimales y fuera de rango provocan un error de arranque
comprensible en español. El entorno prevalece sobre .env, que es opcional.
