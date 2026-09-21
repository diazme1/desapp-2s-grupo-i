# Research: Catálogo de jugadores

## Decisión 1: Mantener el modelo de dominio separado de TypeORM

- **Decisión**: Definir `Liga`, `Equipo`, `Jugador` e identidad externa como modelos
  de dominio en `backend/src/players/domain/`. Las entidades TypeORM vivirán en
  `backend/src/players/persistence/` y se mapearán mediante un repository.
- **Motivo**: La constitución exige que el dominio no conozca NestJS, HTTP, PostgreSQL
  ni repositories. También permite probar las invariantes sin levantar infraestructura.
- **Alternativas consideradas**: Usar directamente entidades TypeORM como modelos de
  negocio. Se descarta porque mezcla persistencia con reglas de dominio y dificulta
  los tests unitarios.

## Decisión 2: Persistencia relacional normalizada

- **Decisión**: Persistir ligas, equipos, jugadores e identidades externas en tablas
  separadas con relaciones y restricciones de unicidad. Los jugadores mantienen la
  liga y el equipo actuales; la base refuerza que el equipo pertenezca a esa liga.
- **Motivo**: Los endpoints filtran por liga, equipo y posición, y la relación debe
  ser verificable tanto en el dominio como en PostgreSQL.
- **Alternativas consideradas**: Guardar liga y equipo como texto dentro de jugadores.
  Se descarta porque permite inconsistencias, duplica datos y dificulta filtros e
  importaciones idempotentes.

## Decisión 3: UUID para identificadores internos

- **Decisión**: Usar UUID para los identificadores de liga, equipo y jugador, siguiendo
  el modelo existente de usuarios.
- **Motivo**: Es estable, no expone secuencias internas y mantiene consistencia con
  la persistencia actual del proyecto.
- **Alternativas consideradas**: Usar enteros autoincrementales. Se descarta para
  mantener la convención existente y evitar que el identificador público dependa del
  orden de inserción.

## Decisión 4: Identidad externa separada e idempotente

- **Decisión**: Persistir `proveedor` y `externalId` en una entidad relacionada con
  jugador, con una restricción única sobre ambos campos.
- **Motivo**: El scraper futuro podrá actualizar un jugador sin duplicarlo y el dominio
  no queda atado a un proveedor concreto.
- **Alternativas consideradas**: Guardar solamente un `externalId` en jugadores o
  usar el nombre como clave. Se descarta porque distintos proveedores pueden repetir
  identificadores y los nombres no son estables.

## Decisión 5: Seed local mediante migración determinista

- **Decisión**: La migración de catálogo crea el esquema y carga un conjunto mínimo
  determinista con las cinco ligas, equipos y jugadores activos necesarios para probar
  el catálogo local.
- **Motivo**: Esta feature no implementa scraping, pero debe poder ejecutarse y
  demostrarse sin conexión externa. El seed también permite tests de integración
  reproducibles.
- **Alternativas consideradas**: Llamar a WhoScored al iniciar la aplicación o dejar
  la base vacía. La primera alternativa viola el alcance y la continuidad local; la
  segunda no permite demostrar el endpoint sin pasos manuales adicionales.

## Decisión 6: Validación de filtros con HTTP 400 solo en catálogo

- **Decisión**: Usar un `ValidationPipe` específico para los endpoints de jugadores,
  configurado para responder 400 ante filtros o UUIDs inválidos. Se conserva el 422
  global actual para autenticación y no se modifica ningún test existente.
- **Motivo**: El contrato de esta feature exige 400, mientras que la configuración
  global existente y los tests de autenticación usan 422.
- **Alternativas consideradas**: Cambiar el pipe global a 400. Se descarta porque
  cambiaría el contrato ya implementado de autenticación; también se descarta devolver
  422 para jugadores porque contradice el contrato de la feature.

## Decisión 7: Sin llamadas externas en el catálogo

- **Decisión**: `GET /players` y `GET /players/:id` leen exclusivamente desde el
  repository local. No se implementan cliente HTTP, parser HTML ni Adapter en esta
  feature.
- **Motivo**: La primera spec construye el destino canónico. La futura spec de scraping
  deberá transformar WhoScored a ese contrato mediante `WhoscoredJugadoresAdapter`.
- **Alternativas consideradas**: Consultar WhoScored durante cada lectura o crear el
  scraper dentro del módulo de jugadores. Se descartan por acoplamiento, falta de
  continuidad ante fallas y separación explícita de entregas.

## Decisión 8: Consulta local indexada sin paginación

- **Decisión**: Implementar filtros opcionales por liga, equipo y posición, aplicar
  AND, ordenar por nombre e id y devolver `items` y `total` sin paginación.
- **Motivo**: Es el contrato requerido y alcanza la primera entrega; los índices de
  liga, equipo, posición y activo permiten una consulta directa.
- **Alternativas consideradas**: Agregar paginación, búsqueda parcial o filtros OR.
  Se difieren porque no están requeridos y cambiarían el contrato observable.
