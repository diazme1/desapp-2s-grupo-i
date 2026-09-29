# Modelo de datos: Protección API key para refresh del catálogo

Esta feature no agrega entidades persistentes ni migraciones. Los elementos nuevos son
configuración de proceso, credenciales efímeras y un provider de configuración en memoria.

## Secreto de refresh

| Campo | Tipo | Regla |
|---|---|---|
| `CATALOG_REFRESH_API_KEY` | string de entorno | Obligatorio en ambientes no-test; representa una cadena base64url generada desde al menos 32 bytes de aleatoriedad. |
| mínimo operativo | bytes UTF-8 | La cadena configurada debe tener al menos 32 bytes UTF-8; no se usan mínimos alternativos de caracteres o bytes decodificados. |
| placeholders | lista de configuración | Se rechazan `change-me`, `changeme`, `your-api-key`, `your-secret`, `secret` y `test`, además de vacío/espacios. Solo se evalúa la configuración. |
| representación interna | `Buffer` | Se crea en memoria para comparar bytes; nunca se serializa, persiste ni se devuelve. |
| ciclo de vida | configuración de proceso | Se carga y valida al iniciar; cambiarlo requiere modificar el entorno y reiniciar. No hay rotación por API. |

## Configuración validada inyectada

| Campo | Origen | Regla |
|---|---|---|
| secreto esperado | provider/configuración validada | Se entrega a `CatalogRefreshApiKeyGuard` mediante inyección; el guard no lee directamente `process.env`. |
| estado no-test | bootstrap | Valores ausentes o inseguros rechazan el inicio antes de aceptar requests. |
| estado test | fixture controlada | Puede evitar la validación de despliegue, pero no desactiva la validación del header en el endpoint. |

## Credencial recibida

| Campo | Origen | Regla |
|---|---|---|
| `X-API-Key` | header HTTP de `POST /catalog/refresh` | Debe ser un único string no vacío, sin trimming ni normalización, y coincidir byte a byte con la configuración mediante `timingSafeEqual` cuando las longitudes coinciden. |
| longitud distinta | request | Se rechaza antes de invocar `timingSafeEqual`; produce HTTP 401 genérico y no llega al Service. |
| valor inválido | request | Produce HTTP 401 genérico; no se registra ni se devuelve. |

## Credenciales combinadas de refresh

| Elemento | Estado válido | Estado inválido |
|---|---|---|
| JWT Bearer | `JwtAuthGuard` verifica formato, firma, algoritmo, identidad y vencimiento. | HTTP 401; no se evalúa el caso de uso. |
| API key | El guard compara buffers de igual longitud con `crypto.timingSafeEqual`. | HTTP 401; no se ejecuta el refresh. |
| autorización final | Ambos elementos válidos en la misma request. | Cualquier elemento ausente o inválido rechaza la request. |

## Estados de configuración

1. **Válida**: la aplicación puede iniciar y el provider entrega al guard un secreto esperado
   no vacío.
2. **Inválida no-test**: `validateEnvironment` rechaza el bootstrap antes de aceptar tráfico,
   sin incluir el valor o derivados en el error.
3. **Fixture test**: el bootstrap puede omitir el secreto de despliegue, pero el arnés entrega
   una clave controlada al provider y las requests strict deben enviarla.

No hay relaciones, claves foráneas, tablas ni cambios a `Liga`, `Equipo`, `Jugador` o al
catálogo persistido.
