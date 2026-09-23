# Research: Catálogo base de jugadores

## Decisión 1: Recursos de Football-Data.org

- **Decisión**: usar la API v4 con `GET /v4/competitions/{code}/teams` para descubrir los
  equipos de cada competencia y `GET /v4/teams/{id}` para obtener la plantilla `squad`.
- **Motivo**: son los recursos documentados por el proveedor para listar equipos y consultar
  la plantilla de un equipo; el adapter puede traducirlos sin exponer sus respuestas al
  dominio.
- **Alternativas consideradas**: consumir estadísticas o goleadores (descartado porque no
  pertenece al catálogo base), usar WhoScored como fuente primaria (descartado por el
  documento de contexto) y consultar el proveedor en cada `GET` (descartado porque las
  lecturas deben ser locales).
- **Fuente**: [Competition API](https://docs.football-data.org/general/v4/competition.html)
  y [Team API](https://docs.football-data.org/general/v4/team.html).

## Decisión 2: Competencias iniciales

- **Decisión**: configurar por defecto `PL`, `BL1`, `PD`, `SA` y `FL1`, con posibilidad de
  reemplazarlas mediante `FOOTBALL_DATA_COMPETITIONS`.
- **Motivo**: coincide con las cinco ligas del contexto de producto y permite pruebas con
  un subconjunto sin modificar código.
- **Alternativas consideradas**: importar todas las competencias disponibles (descartado
  por alcance y por límites del proveedor) y fijar una sola liga (descartado porque no
  cubre el catálogo solicitado).

## Decisión 3: Identidad y actualización

- **Decisión**: generar UUID interno para cada liga, equipo y jugador nuevo, y usar el ID
  externo del proveedor como clave de upsert. El UUID del jugador no cambia al actualizar
  nombre, atributos o equipo.
- **Motivo**: separa la identidad propia de la fuente y permite repetir refresh sin
  duplicados.
- **Alternativas consideradas**: usar directamente el ID externo como identidad pública
  (descartado por la decisión explícita del contexto) y borrar/reinsertar el catálogo
  completo (descartado porque rompe referencias y estabilidad).

## Decisión 4: Atomicidad y continuidad local

- **Decisión**: completar y validar la respuesta externa antes de iniciar una transacción
  de upsert de ligas, equipos y jugadores. Una falla deja intacto el último catálogo.
- **Motivo**: cumple la invariante de continuidad local y evita estados parciales.
- **Alternativas consideradas**: guardar cada entidad inmediatamente al recibirla
  (descartado por riesgo de carga parcial) y refrescar desde cada endpoint de lectura
  (descartado por acoplamiento y disponibilidad).

## Decisión 5: Seguridad y contratos

- **Decisión**: mantener públicas las lecturas del catálogo local y proteger el refresh con
  Bearer JWT. No se agregan roles administrativos en esta spec.
- **Motivo**: consultar datos de catálogo no depende de identidad; ejecutar una carga
  administrativa sí debe evitar una ruta anónima.
- **Alternativas consideradas**: hacer público el refresh (descartado por seguridad) y
  crear roles admin ahora (descartado porque la spec de autenticación los pospone).

## Decisión 6: Pruebas

- **Decisión**: probar dominio, adapter y servicios con unitarios aislados; probar DTOs,
  controllers, repository, migración y continuidad local con integración HTTP sobre
  PostgreSQL real levantado por Testcontainers.
- **Motivo**: cumple la constitución y evita validar persistencia contra una base distinta
  de la usada por la aplicación.
- **Alternativas consideradas**: SQLite o mocks para toda la persistencia (descartados;
  solo sirven para unitarios sin infraestructura).
