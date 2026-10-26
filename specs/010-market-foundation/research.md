# Investigación: Fundamentos del mercado de jugadores

## Decisión 1: Registro y saldo inicial

- **Decisión**: Mantener `POST /auth/register`, `AuthService.register` y el constructor
  público del servicio. Extender el contrato interno de `UserRepository.create` con una
  opción de saldo inicial exacta, por ejemplo `create(user, { saldoInicial: Creditos.inicial() })`.
  `TypeOrmUserRepository` persistirá `usuarios` y `saldos_usuario` dentro de una única
  transacción PostgreSQL.
- **Motivo**: El repositorio de usuarios ya posee el DataSource que escribe la identidad y
  puede mantener la atomicidad sin introducir una transacción distribuida. El bootstrap del
  superusuario seguirá llamando `create(user)` sin saldo inicial especial. La restricción
  única de `usuarios.correo` continúa siendo la autoridad ante registros concurrentes; el
  `findByEmail` previo queda como optimización.
- **Alternativas consideradas**:
  - Agregar el saldo como columna de `usuarios`: descartado porque mezcla identidad y saldo y
    contradice la entidad independiente definida en la spec.
  - Inyectar un nuevo servicio de saldos en `AuthService`: descartado para esta iteración
    porque exigiría coordinar dos repositorios y rompería la forma de los tests unitarios
    existentes.
  - Hacer que todo `UserRepository.create` acredite 1.000: descartado porque también se
    usa en el bootstrap del superusuario.

## Decisión 2: Representación exacta de créditos y cotizaciones

- **Decisión**: Persistir saldos y cotizaciones mediante value objects basados en unidades
  mínimas enteras `bigint`, con escala fija de dos decimales. `Creditos` representa
  `1.000,00` como `100.000` unidades y `Cotizacion` representa `1.00` como `100` unidades
  y `83.75` como `8375` unidades.
- **Decisión de persistencia**: PostgreSQL conserva `numeric(14,2)` para
  `historial_cotizacion.cotizacion`. El transformer recibe el texto decimal exacto de `pg`, lo
  parsea mediante `Cotizacion` y escribe el formato decimal canónico de `Cotizacion`; nunca
  usa `Number(...)` para construir el valor de dominio.
- **Decisión de apertura**: la cotización inicial se construye como
  `Cotizacion.fromUnidades(100)` y se persiste como el literal decimal `1.00`.
- **Decisión de presentación**: el transformer entrega `Cotizacion` al camino real de lectura
  y el DTO existente puede continuar exponiendo un número JSON para conservar el contrato HTTP;
  esa conversión ocurre únicamente al serializar la respuesta y no vuelve a entrar al dominio
  ni participa de cálculos financieros. Los fixtures unitarios históricos que inyectan un
  `number` conservan un adapter de compatibilidad de lectura, sin habilitar números en dominio,
  services ni contratos internos de escritura.
- **Motivo**: evita `float`, conserva exactitud entre PostgreSQL, dominio y futuras
  operaciones, y permite verificar parseo, formateo, comparación, precisión y límites sin
  cambiar el endpoint existente.
- **Alternativas consideradas**:
  - `number` de JavaScript en dominio o services: descartado por depender de aritmética de
    punto flotante.
  - `numeric(14,2)` como `number` en TypeORM: descartado porque pierde la separación entre
    persistencia y dominio y el transformer actual convierte el valor a `number`.
  - `string` decimal como tipo de dominio: descartado porque no ofrece comparación ni
    validación centralizadas; se usa solamente como representación textual de borde del
    transformer y del DTO.

## Decisión 3: Límites de persistencia del Mercado

- **Decisión**: Crear `MarketModule`, `MarketRepository` y un DataSource compartido dentro del
  contexto de jugadores para la transacción de jugadores, tokens, tenencias y cotización.
  El DataSource incluye las entidades existentes de usuarios, jugadores, estadísticas y
  cotizaciones, además de las nuevas entidades de Mercado. `quotes.repository.ts` y
  `HistorialCotizacionService` se conservan como lectura; la escritura de la apertura se
  abstrae con `QuoteOpeningWriter` en `backend/src/quotes/quote-opening-writer.ts` y se
  implementa con `TypeOrmQuoteOpeningWriter` en
  `backend/src/players/persistence/typeorm-quote-opening-writer.ts`.
- **Motivo**: Los DataSources Nest actuales de usuarios y jugadores son separados. Un
  DataSource compartido para el agregado de emisión evita transacciones distribuidas y permite
  que el `SELECT ... FOR UPDATE`, los tokens, las tenencias y la apertura se confirmen juntos.
  `PlayersModule` registra y exporta el provider de `QuoteOpeningWriter`, mientras
  `MarketInitializationService` coordina su uso junto con el repository de Mercado. No es
  necesario convertir todo el backend a un DataSource global.
- **Alternativas consideradas**:
  - Un `DatabaseModule` global único: más limpio a largo plazo, pero refactoriza
    `UsersModule`, `PlayersModule`, lifecycle shutdown y tests existentes; queda fuera de la
    mínima superficie de esta feature.
  - Un DataSource propio aislado de `market`: descartado porque duplica conexiones y no
    reutiliza de forma segura el contexto de persistencia de jugadores/cotizaciones.
  - Transacciones distribuidas entre usuarios y jugadores: descartadas; ninguna operación de
    esta feature modifica saldo y tokens en la misma transacción.

## Decisión 4: Tokens y tenencias

- **Decisión**: `tokens` tendrá una fila por token, con `id_token`, `id_jugador`,
  `id_usuario_owner`, `numero_emision` 1..100, `id_lote_emision`, `emitido_en` y
  `actualizado_en`. La clave lógica `(id_jugador, numero_emision)` será única. `tenencias_jugador`
  tendrá una fila por `(id_usuario, id_jugador)` y `cantidad_tokens` entera; los tokens
  individuales son la fuente de identidad y propietario, y la tenencia es un agregado
  persistido que debe coincidir con el conteo.
- **Motivo**: Mantiene separadas identidad/propiedad, agregación futura de portfolio y
  valuación. Las claves foráneas con `ON DELETE RESTRICT` protegen el suministro histórico.
- **Alternativas consideradas**:
  - Guardar solo una cantidad por jugador y usuario: descartado porque no cumple la emisión
    individual ni permite identificar cada token.
  - Guardar el precio en cada token: descartado por la separación explícita con cotizaciones.
  - Recalcular tenencias siempre en lectura: descartado porque la spec pide una estructura
    agregada persistida para futuras operaciones y consistencia transaccional.

## Decisión 5: Inicialización idempotente y concurrencia

- **Decisión**: `MarketInitializationService` resolverá el superusuario reutilizando
  `SuperadminBootstrapService` mediante un método interno idempotente `ensureSuperadmin()`.
  Por cada ejecución abrirá una única transacción, listará jugadores ordenados por ID y
  bloqueará sus filas con `FOR UPDATE` en ese orden. Para cada jugador: cero tokens crea la
  serie 1..100, 100 tokens válidos realiza no-op y valida tenencias/cotización, cualquier
  otra cantidad o número inválido aborta la transacción. Se usará `UNIQUE` y reintento
  acotado para `40001`/`40P01`; nunca `upsert` sobre propietario.
- **Motivo**: El lock por jugador evita que dos inicializadores creen la misma serie; las
  restricciones de PostgreSQL son la última defensa. Una reejecución no puede transferir
  tokens que una feature futura ya haya entregado.
- **Alternativas consideradas**:
  - `ON CONFLICT DO UPDATE`: descartado porque podría sobrescribir propietarios.
  - Solo `DO NOTHING`: insuficiente porque ocultaría emisiones parciales o inconsistentes.
  - Un lock global de toda la tabla: descartado por mayor contención y menor escalabilidad.

## Decisión 6: Cotización inicial sin referencias artificiales

- **Decisión**: Reutilizar `historial_cotizacion` como única fuente de cotizaciones y agregar
  la categoría explícita `tipo_estrategia = 'apertura_mercado'`. La fila tendrá `cotizacion =
  1.00`, una única versión estable de la estrategia de apertura, y `id_estadistica` e
  `id_recalculo` nulos porque la apertura no proviene de estadísticas ni de un recálculo.
  Una restricción de consistencia permitirá nulabilidad solo para la apertura, exigirá las
  referencias completas para cotizaciones calculadas y un índice único parcial garantizará
  una apertura por jugador. La escritura se hará dentro de la transacción de emisión.
- **Motivo**: El esquema actual exige `id_estadistica` y el sistema no debe crear estadísticas
  vacías o UUIDs inventados. `QuoteOpeningWriter` permite persistir la apertura legítima sin
  convertir el repository de lectura en writer ni generar referencias falsas. La versión
  estable de `apertura_mercado` mantiene reproducibilidad: el valor se obtiene de la regla fija
  1.00 y de la versión almacenada. El historial calculado existente no cambia.
- **Alternativas consideradas**:
  - UUIDs sintéticos y una estadística existente: rechazado por referencias falsas y porque
    algunos jugadores no tienen estadísticas.
  - Tabla separada para cotización inicial: rechazada por duplicar el sistema de cotizaciones
    y obligar a combinar fuentes al listar historial.
  - Crear tablas reales de estrategias, versiones y recálculos: válida, pero amplía el
    alcance y no es necesaria para una apertura fija.
  - Dejar todas las referencias nulas: rechazada porque pierde la versión reproducible
    exigida por la Constitución; solo `id_estadistica` e `id_recalculo` son nulos para la
    apertura.

## Decisión 7: Migraciones y backfill

- **Decisión**: Separar migraciones posteriores a las existentes y no emitir tokens desde una
  migración. El orden será: extensión de historial para apertura, creación/backfill de
  `saldos_usuario` con cero para usuarios existentes, creación de `tokens`, creación de
  `tenencias_jugador`. Luego el bootstrap interno puede emitir tokens para el catálogo actual.
- **Motivo**: Las migraciones pueden ejecutarse sin catálogo ni superusuario configurado;
  emitir tokens requiere reglas de dominio, configuración y transacción de aplicación.
  Backfill cero evita usuarios existentes sin fila de saldo sin asignarles créditos nuevos.
- **Alternativas consideradas**:
  - Emitir tokens desde la migración: descartado porque no hay garantía de catálogo ni
    superusuario y mezcla DDL con lógica de negocio.
  - Dar 1.000 créditos a usuarios ya existentes: descartado; la spec limita la asignación a
    nuevos registros y no define una carga retroactiva.

## Decisión 8: Tests y soporte existente

- **Decisión**: Agregar unitarios para dominio, repository y servicios; agregar integración
  específica de `market-foundation` con PostgreSQL/Testcontainers; ampliar las listas de
  migraciones y entidades en los helpers existentes y cambiar únicamente el orden de limpieza
  para respetar FK. Agregar además una prueba de integración que simule la indisponibilidad del
  proveedor externo y confirme que las lecturas locales ya persistidas de jugadores, tokens y
  cotizaciones continúan funcionando. No se modifican assertions ni se eliminan tests
  existentes.
- **Motivo**: Los helpers tienen listas manuales y actualmente ejecutan `TRUNCATE TABLE
  usuarios`, que fallará con `saldos_usuario` referenciando usuarios. Actualizar infraestructura
  de pruebas es necesario para que el test suite siga funcionando y no es una modificación de
  comportamiento de un test existente.
- **Alternativas consideradas**:
  - Omitir FK para conservar los truncados: descartado porque crea relaciones huérfanas.
  - Agregar saldo como columna en usuarios: descartado por separación del modelo.
  - Modificar expectativas de tests existentes: descartado por autorización explícita requerida.

## Riesgos y decisiones para la implementación

- El sistema actual no garantiza unicidad global de `rol = 'superadmin'`; la resolución se
  hará por `SUPERADMIN_EMAIL` y se fallará si la cuenta no existe o no tiene rol correcto.
- La cotización de apertura es una excepción explícita al requerir estadística, no una
  excepción a la reproducibilidad: debe conservar un `id_version_estrategia` estable y checks
  de tipo/valor.
- Un refresh de catálogo posterior a la inicialización no crea un endpoint nuevo. El servicio
  de inicialización queda expuesto como caso de uso interno y se ejecuta durante el bootstrap;
  una ejecución posterior podrá incorporarse a un job o comando futuro sin modificar el
  contrato REST de esta feature.
- Los helpers compartidos deberán limpiar `tenencias_jugador`, `tokens`, `historial_cotizacion`,
  estadísticas, catálogo, `saldos_usuario` y usuarios en orden inverso de FK.
