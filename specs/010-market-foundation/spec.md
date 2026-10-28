# Feature Specification: Fundamentos del mercado de jugadores

**Feature Branch**: `010-market-foundation`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Especificar la feature market-foundation de Football Player Market reutilizando autenticación, registro, superusuario, catálogo e historial de cotizaciones. Asignar 1.000 créditos iniciales a cada nuevo usuario, crear tokens individuales, emitir 100 tokens por jugador inicialmente propiedad del superusuario a 1 crédito por token, hacer idempotente la inicialización, separar tokens, cotizaciones y transacciones, y definir saldos y tenencias. Dejar fuera compra, venta, portfolio, historial de operaciones y financiamiento de recompras. Incluir pruebas unitarias y de integración con PostgreSQL sin modificar tests existentes."

## Contexto y estado actual

Football Player Market ya cuenta con:

- un único flujo de registro y autenticación bajo `/auth/register` y `/auth/login`;
- usuarios con roles `usuario` y `superadmin`;
- un bootstrap operacional idempotente que crea el superusuario desde configuración y no
  promueve automáticamente cuentas existentes;
- un catálogo local persistido de jugadores;
- un sistema existente de cotizaciones históricas consultable por jugador.

Esta feature agrega los fundamentos persistentes del Mercado sobre esas capacidades. Debe
extender el registro existente y reutilizar el superusuario, sus roles y su bootstrap. No
crea endpoints alternativos de registro o autenticación ni vuelve a implementar la creación
del superusuario.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar una cuenta con saldo inicial (Priority: P1)

Como persona que se incorpora al mercado, quiero que mi cuenta nueva reciba automáticamente
1.000 créditos para quedar habilitada para futuras operaciones, sin tener que realizar una
carga manual.

**Why this priority**: El saldo inicial es una condición previa para que una cuenta nueva
pueda participar del Mercado y debe quedar consistente desde el primer momento.

**Independent Test**: Registrar una cuenta válida mediante el endpoint existente y verificar
que se crea un único saldo de 1.000 créditos junto con el usuario, sin tocar los flujos de
login ni crear otro endpoint.

**Acceptance Scenarios**:

1. **Given** que no existe el correo normalizado, **When** se usa el registro existente con
   credenciales válidas, **Then** se crea el usuario con rol `usuario` y un saldo disponible
   de exactamente 1.000 créditos.
2. **Given** un correo ya registrado, **When** se repite el registro con cualquier
   combinación de mayúsculas o espacios equivalentes, **Then** se rechaza el intento, no se
   crea otro usuario y no se acredita ningún saldo adicional.
3. **Given** datos de registro inválidos o una falla al persistir el saldo, **When** se
   intenta registrar la cuenta, **Then** la operación falla sin dejar usuario ni saldo
   parcial.

---

### User Story 2 - Inicializar el suministro de tokens del catálogo (Priority: P1)

Como operador del Mercado, quiero inicializar los tokens de los jugadores ya cargados para
que cada jugador tenga una oferta fija y trazable antes de habilitar compras o ventas.

**Why this priority**: El suministro inicial y su propietario son invariantes del dominio;
sin ellos no existe una base segura para las operaciones futuras.

**Independent Test**: Con un catálogo que contenga jugadores y un superusuario ya provisto,
ejecutar la inicialización y comprobar que cada jugador queda asociado a 100 tokens
individuales, todos inicialmente propiedad del superusuario y con una cotización de apertura
del jugador de 1 crédito, aplicable a cada uno de sus tokens, en el sistema de cotizaciones
existente.

**Acceptance Scenarios**:

1. **Given** un jugador persistido sin tokens y un superusuario creado por el bootstrap
   existente, **When** se inicializa el Mercado, **Then** se emiten exactamente 100 tokens
   distintos para ese jugador, todos con el superusuario como propietario actual.
2. **Given** varios jugadores persistidos, **When** se completa la inicialización, **Then**
   cada jugador tiene exactamente 100 tokens y no se comparten tokens entre jugadores.
3. **Given** una inicialización ya completada, **When** se reintenta por reinicio,
   concurrencia o ejecución repetida, **Then** el resultado no crea duplicados, no altera
   propietarios existentes y conserva una única cotización de apertura por jugador.
4. **Given** un jugador incorporado al catálogo después de una inicialización anterior,
   **When** se vuelve a ejecutar la inicialización, **Then** solo se prepara el suministro
   faltante de ese jugador y se preservan los tokens ya existentes de los demás jugadores.
5. **Given** que no existe un superusuario válido o la inicialización detecta una cantidad
   inconsistente distinta de cero o de 100 tokens para un jugador, **When** se ejecuta,
   **Then** informa el estado inválido y no deja una inicialización parcial.

---

### User Story 3 - Disponer de saldos y tenencias consistentes para el futuro (Priority: P2)

Como responsable del producto, quiero que cada usuario y cada propietario de tokens tengan
estructuras de saldo y tenencia explícitas para que las futuras operaciones puedan ejecutarse
sin mezclar identidad, valuación y auditoría financiera.

**Why this priority**: Las compras, ventas y el portfolio quedan fuera de esta entrega, pero
necesitan una base de relaciones e invariantes definida desde ahora.

**Independent Test**: Persistir usuarios, jugadores y tokens inicializados, y verificar que
   los saldos y las tenencias agregadas mantienen sus relaciones, cantidades e invariantes
   sin ejecutar ninguna compra, venta ni consulta de portfolio.

**Acceptance Scenarios**:

1. **Given** un usuario registrado, **When** se completa el flujo de registro, **Then**
   existe un único saldo asociado a ese usuario y no existe una segunda fila de saldo para
   la misma identidad.
2. **Given** el suministro inicial de un jugador, **When** se construyen sus tenencias
   agregadas, **Then** el superusuario figura con 100 tokens de ese jugador y la cantidad
   coincide con los tokens cuyo propietario actual es el superusuario.
3. **Given** una cotización de jugador, **When** se consulta el valor vigente, **Then** el
   valor se obtiene del sistema de cotizaciones existente y no de una columna de cada token.
4. **Given** esta feature sin operaciones financieras, **When** se inicializan saldos,
   tokens y tenencias, **Then** no se generan transacciones de compra, venta ni auditorías
   financieras simuladas.

### Edge Cases

- El correo del nuevo usuario puede llegar con espacios laterales o mayúsculas; debe
  normalizarse con la misma regla ya usada por autenticación.
- El registro puede completarse en paralelo con otro registro del mismo correo; solo una
  cuenta y un saldo deben resultar persistidos.
- Una falla al crear el saldo después de crear la identidad no debe dejar una cuenta sin
  saldo ni requerir un endpoint de compensación.
- El catálogo puede estar vacío; la inicialización debe terminar sin emitir tokens y sin
  fabricar jugadores.
- Dos procesos pueden intentar inicializar el mismo jugador al mismo tiempo; el resultado
  final debe ser una única emisión de 100 tokens o un error sin escritura parcial.
- La inicialización puede encontrar 100 tokens ya existentes con propietarios modificados
  por una feature futura; debe conservar esos propietarios y no transferir tokens al
  superusuario.
- Una cantidad intermedia de tokens, tokens duplicados o una relación con un usuario o
  jugador inexistente debe tratarse como inconsistencia y no como una oportunidad para
  completar silenciosamente datos corruptos.
- Las cotizaciones históricas existentes no deben sobrescribirse ni eliminarse para crear
  la cotización de apertura.
- La pérdida temporal del proveedor externo de estadísticas o cotizaciones no debe impedir
  trabajar con jugadores, tokens y cotizaciones que ya estén persistidos localmente.

### Pruebas requeridas

- Tests unitarios del dominio para saldo, token, tenencia e invariantes de emisión,
  incluyendo límites, duplicados lógicos, cantidades inválidas y preservación del
  propietario.
- Tests unitarios del caso de uso de registro extendido y de la inicialización idempotente,
  incluyendo reintentos, concurrencia simulada, ausencia del superusuario y fallas de
  persistencia.
- Tests de integración de repositorios y servicios contra PostgreSQL real levantado con el
  soporte de integración existente y Testcontainers, cubriendo migraciones, claves
  foráneas, unicidad, restricciones de saldo y consistencia entre tokens y tenencias.
- Tests de integración del endpoint existente de registro para comprobar el saldo inicial,
  conflictos y ausencia de datos parciales, sin agregar un endpoint de registro alternativo.
- Los tests existentes no deben modificarse ni eliminarse. Si una prueba existente impide
  verificar la nueva funcionalidad, el cambio debe solicitar autorización explícita antes de
  realizarse.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST extender el flujo existente de registro para acreditar
  automáticamente 1.000 créditos exactos al nuevo usuario, manteniendo el endpoint,
  autenticación y rol `usuario` ya existentes.
- **FR-002**: El registro MUST crear la identidad y su saldo como una única operación
  consistente: si cualquiera de los dos estados no puede persistirse, no debe quedar el otro
  estado creado de forma parcial.
- **FR-003**: El sistema MUST conservar la normalización y unicidad de correo existentes;
  un registro duplicado MUST NOT crear otro usuario ni volver a acreditar el saldo.
- **FR-004**: El sistema MUST reutilizar el rol `superadmin` y el bootstrap operacional
  existentes; esta feature MUST NOT crear un endpoint, credencial, rol o mecanismo paralelo
  para generar o promover al superusuario.
- **FR-005**: El sistema MUST contar con una entidad de tokens individuales con, como mínimo,
  `id_token` único, `id_jugador` y `id_usuario_owner`, además de fecha de emisión, número de
  emisión por jugador y las referencias de trazabilidad necesarias.
- **FR-006**: Cada token MUST pertenecer a un único jugador y tener un único propietario
  actual; un jugador MUST tener exactamente 100 tokens individuales emitidos cuando su
  suministro esté inicializado.
- **FR-007**: La primera emisión de cada jugador MUST asignar sus 100 tokens al superusuario
  ya existente y MUST registrar una única cotización de apertura de 1 crédito para el
  jugador en el sistema de cotizaciones existente; esa cotización determina el valor inicial
  de cada uno de sus tokens y no se guarda en cada token.
- **FR-008**: La inicialización MUST ser idempotente y segura ante reinicios, reintentos y
  ejecuciones concurrentes: una emisión completa debe ser un no-op, una emisión nueva debe
  crear una sola serie de 100 tokens y una inconsistencia debe fallar sin dejar una escritura
  parcial.
- **FR-009**: La inicialización MUST ser no destructiva respecto de propietarios y
  cotizaciones existentes; no debe transferir tokens ni sobrescribir cotizaciones para hacer
  coincidir nuevamente un estado que ya fue modificado por operaciones futuras.
- **FR-010**: El valor vigente de un jugador MUST resolverse mediante el sistema de
  cotizaciones e historial existente. La entidad `tokens` MUST NOT almacenar una cotización,
  precio, valor actual ni precio promedio.
- **FR-011**: El sistema MUST definir y persistir un saldo por usuario, con créditos exactos,
  no negativos y una relación uno a uno con la identidad. El saldo inicial de un usuario
  registrado será 1.000 créditos; esta feature no define una carga inicial especial para el
  superusuario existente.
- **FR-012**: El sistema MUST definir una tenencia agregada por par usuario-jugador, con
  cantidad de tokens no negativa y una restricción de unicidad por par. La cantidad debe ser
  consistente con el conteo de tokens cuyo propietario actual es ese usuario.
- **FR-013**: Las relaciones entre usuarios, jugadores, saldos, tenencias, tokens y
  cotizaciones MUST impedir referencias huérfanas y conservar los identificadores estables
  del catálogo y de las cuentas existentes.
- **FR-014**: Saldos, cotizaciones y cantidades de tokens MUST utilizar representación exacta;
  las reglas del dominio MUST NOT depender de aritmética de punto flotante.
- **FR-015**: Esta feature MUST dejar explícita la separación de responsabilidades: `tokens`
  representa identidad y propietario actual; `cotizaciones` representa el valor del jugador a
  lo largo del tiempo; `transacciones` representará operaciones financieras inmutables y su
  auditoría. Ninguna de esas responsabilidades debe mezclarse en una sola entidad.
- **FR-016**: La base de la feature MUST incluir tests unitarios y de integración con
  PostgreSQL real para casos felices, borde, reintentos, restricciones de integridad y
  consistencia entre entidades, sin modificar ni eliminar tests existentes.
- **FR-017**: El contrato público del registro existente MUST conservar su forma actual y
  MUST NOT requerir un endpoint duplicado para informar o consultar el saldo; la asignación
  de 1.000 créditos se verifica mediante el saldo persistido. No se requiere agregar
  endpoints públicos de compra, venta, saldo, tenencias o portfolio en esta feature.

### Entidades y relaciones

- **Usuario**: entidad existente que representa la identidad autenticable y su rol. Se
  relaciona uno a uno con `SaldoUsuario`, uno a muchos con `TokenJugador` como propietario
  actual y uno a muchos con `TenenciaJugador`.
- **SaldoUsuario**: saldo disponible de una cuenta, con identificador de usuario, créditos
  disponibles exactos y fechas de creación y actualización. No contiene tokens ni cotización.
- **Jugador**: entidad existente del catálogo. Se relaciona uno a muchos con tokens y con
  cotizaciones históricas.
- **TokenJugador**: emisión individual de un jugador. Tiene `id_token`, `id_jugador`,
  `id_usuario_owner`, número de emisión del 1 al 100, fecha de emisión y trazabilidad de la
  emisión. Su propietario actual puede cambiar en operaciones futuras, pero el token no se
  reutiliza para otro jugador.
- **TenenciaJugador**: agregado de cantidad por usuario y jugador, identificado por la pareja
  `(id_usuario, id_jugador)`. Sirve de base para futuras posiciones y debe reflejar el conteo
  de `TokenJugador` por propietario.
- **Cotizacion / HistorialCotizacion**: entidad existente que registra el valor de un jugador
  a lo largo del tiempo, la fecha de vigencia, la estrategia y su procedencia. La cotización
  de apertura de 1 crédito se registra aquí, no en `TokenJugador`.
- **Transaccion**: entidad futura, fuera de la implementación de esta feature, que deberá
  registrar operaciones financieras append-only, su clave de idempotencia y su auditoría sin
  convertirse en la fuente de identidad o de cotización de un token.

### Restricciones de integridad

- `id_token` es único y no nulo.
- La pareja `(id_jugador, numero_emision)` es única; `numero_emision` solo admite valores
  entre 1 y 100.
- Cada token referencia un jugador y un usuario existentes; esas relaciones no pueden quedar
  huérfanas.
- Para cada jugador inicializado, la cantidad de tokens es exactamente 100 y la suma de las
  tenencias por propietario es exactamente 100.
- Cada usuario tiene como máximo un `SaldoUsuario`, cuyo saldo es exacto y no negativo.
- Cada pareja usuario-jugador tiene como máximo una `TenenciaJugador`, cuya cantidad es
  entera, no negativa y no supera el suministro total del jugador.
- La creación de la cuenta y el saldo inicial es atómica; no se acepta un usuario sin saldo
  ni un saldo sin usuario.
- La cotización inicial y las cotizaciones históricas son append-only: no se sobrescriben ni
  se eliminan para resolver reintentos.
- La entidad `TokenJugador` no contiene campos de cotización o precio.
- Un estado incompleto de emisión no puede confirmarse como una emisión válida: la operación
  debe revertirse o informar una inconsistencia antes de continuar.

## Alcance y límites

### Incluido

- Extensión del registro existente con saldo inicial de 1.000 créditos.
- Persistencia de tokens individuales y su propietario actual.
- Inicialización idempotente de 100 tokens por jugador del catálogo.
- Registro de la cotización de apertura de 1 crédito en el sistema de cotizaciones existente.
- Estructura de saldos, tenencias y relaciones necesarias para las siguientes features.
- Invariantes, integridad, trazabilidad y pruebas unitarias y de integración requeridas.

### Fuera de alcance

- Comprar, vender, transferir o recomprar tokens.
- Portfolio, posiciones públicas o consultas de tenencias y saldos.
- Consulta del historial de operaciones o creación de transacciones financieras reales.
- Cálculo, recálculo o reemplazo de la estrategia de cotizaciones existente.
- Creación, promoción o reemplazo del superusuario y su bootstrap.
- Definición de cómo se financian las recompras del superusuario.
- Nuevos endpoints de registro, autenticación, compra, venta o portfolio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los registros válidos probados crea exactamente una cuenta de rol
  `usuario` y un saldo inicial de 1.000 créditos; el 100 % de los registros duplicados o
  inválidos probados deja cero cuentas y saldos parciales nuevos.
- **SC-002**: Para el 100 % de los jugadores presentes en el catálogo al momento de la
  inicialización, el suministro final contiene exactamente 100 tokens distintos y no existe
  ningún token sin jugador o sin propietario.
- **SC-003**: Repetir la inicialización al menos tres veces, incluyendo un reinicio o una
  ejecución concurrente simulada, conserva la misma cantidad de 100 tokens por jugador y no
  agrega duplicados ni cotizaciones de apertura repetidas.
- **SC-004**: El 100 % de las tenencias iniciales verificadas coincide con el conteo de tokens
  por propietario y el 100 % de los saldos verificados respeta unicidad, no negatividad y
  representación exacta.
- **SC-005**: El 100 % de los casos de inconsistencia probados —superusuario ausente,
  referencias inválidas, duplicados o emisión incompleta— termina sin cambios parciales y
  comunica un error accionable.
- **SC-006**: Ningún token creado por esta feature contiene una cotización propia; el 100 %
  de los valores iniciales y vigentes consultados en las pruebas proviene del sistema de
  cotizaciones existente y conserva su historial, con una única cotización de apertura por
  jugador.
- **SC-007**: Todos los tests unitarios y de integración nuevos pasan contra el entorno de
  PostgreSQL definido por el proyecto y todos los tests existentes permanecen sin cambios y
  continúan pasando.

## Assumptions

- El catálogo persistido de jugadores es la fuente de verdad para decidir qué jugadores
  requieren suministro; un catálogo vacío no produce tokens.
- La inicialización del Mercado será un proceso interno de bootstrap o de preparación
  repetible, no un endpoint público de compra o administración.
- La inicialización se ejecuta después de que el bootstrap existente haya resuelto un único
  superusuario válido; no se crea ni se promueve una cuenta desde esta feature.
- Una emisión se considera válida solo cuando tiene 100 tokens; la operación será atómica y
  no se espera que una ejecución posterior reconstruya silenciosamente una emisión borrada o
  dañada.
- La identificación lógica de cada token se apoya en su jugador y número de emisión, aunque
  el `id_token` pueda ser un identificador generado por el sistema.
- La cotización de apertura se agrega al historial existente solo cuando no existe la
  apertura equivalente; las cotizaciones previas se conservan y no se reescriben.
- Los créditos se tratan como una magnitud exacta con dos decimales como mínimo; el valor
  inicial de 1.000 representa 1.000,00 créditos.
- La tenencia agregada es una vista persistida de soporte para futuras operaciones, pero los
  tokens individuales son la fuente de identidad y propietario actual.
- Las futuras transacciones serán inmutables y append-only, pero esta feature no necesita
  emitirlas para registrar una cuenta o inicializar tokens.
- La implementación deberá conservar la arquitectura y las convenciones de nombres ya
  establecidas por el proyecto y no podrá modificar tests existentes sin autorización
  explícita.
