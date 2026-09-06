<!--
Sync Impact Report
- Versión: plantilla sin ratificar -> 1.0.0 (adopción inicial).
- Principios: se reemplazan los cinco espacios de ejemplo por nueve principios del proyecto:
  stack tecnológico, arquitectura en capas, modelo rico, validación por nivel, tests,
  definición de terminado, idioma, atomicidad e integraciones externas.
- Secciones agregadas: Alcance y decisiones pendientes; Flujo de desarrollo y revisión;
  reglas de Governance.
- Secciones eliminadas: ninguna sección normativa previa; se retiran ejemplos de plantilla.
- Plantillas y comandos: sin modificaciones; consultan esta constitución en runtime.
- Pendiente: definir la organización y alcance del paquete end to end con Supertest.
-->

# Constitución de desapp-2s-grupo-i

## Core Principles

### I. Stack tecnológico

El backend MUST utilizar TypeScript y NestJS; la base de datos MUST ser PostgreSQL.
El frontend MUST utilizar React y TypeScript y comunicarse con el backend mediante HTTP
usando APIs REST. Estas decisiones constituyen el stack base del proyecto.

### II. Arquitectura en capas

El backend MUST respetar el flujo `Controller -> Service -> Domain Model / Repository`
y, para integraciones externas, `Service -> Adapter`.

- **Controller**: MUST recibir requests HTTP, utilizar DTOs y delegar únicamente en Services.
  MUST NOT contener lógica de negocio ni acceder directamente a repositories o adapters.
- **Service**: MUST implementar y orquestar casos de uso, obtener entidades mediante
  repositories, invocar comportamiento del modelo y coordinar persistencia y adapters.
  MUST NOT contener invariantes que pertenezcan al dominio.
- **Modelo de dominio**: MUST contener reglas e invariantes de negocio. MUST NOT conocer
  NestJS, HTTP, PostgreSQL, repositories ni APIs externas.
- **Repository**: MUST abstraer la persistencia y cargar y persistir modelos.
  MUST NOT implementar reglas de negocio.
- **Adapter**: MUST encapsular la comunicación con servicios externos.

Esta separación permite probar el dominio sin infraestructura y cambiar integraciones
sin trasladar sus detalles a las reglas de negocio.

### III. Modelo rico

La lógica de negocio MUST vivir en los objetos del dominio. Las entidades MUST NOT ser
simples estructuras de datos con setters públicos.
Toda operación que modifique el estado de una entidad MUST realizarse mediante un método
de dominio que preserve sus invariantes.

Ejemplos conceptuales de comportamiento:

```typescript
posicion.comprarTokens(...)
posicion.venderTokens(...)
usuario.acreditarSaldo(...)
cotizacion.calcular(...)
```

Un Service MUST NOT modificar directamente el estado con operaciones como
`posicion.cantidad += cantidad` o `usuario.saldo -= total`.

### IV. Cada validación en su nivel

- El DTO de request MUST validar forma y tipos del request y realizar el trimming y la
  sanitización del input.
- El Service MUST comprobar la existencia de las entidades y la viabilidad de la acción
  a nivel de caso de uso; por ejemplo, que los IDs resuelvan y las entidades se encuentren.
- Los objetos del modelo MUST proteger las invariantes del dominio y lanzar excepciones
  propias del dominio cuando se violen.

La viabilidad del caso de uso MUST NOT utilizarse como motivo para trasladar invariantes
del modelo al Service.

### V. Tests y protección de tests existentes

- Los tests unitarios del dominio MUST ejecutarse sin NestJS y sin base de datos.
- Los tests de integración de Services y Repositories MUST ejecutarse contra PostgreSQL
  real levantado con Testcontainers.
- Los tests end to end MUST utilizar Supertest y estar únicamente en su propio paquete.
  MUST NOT incluirse dentro de un test de Service. Su organización detallada y alcance
  se definirán más adelante.
- Los tests MUST cubrir casos felices y casos borde.
- En ninguna fase del flujo se MUST modificar ni borrar un test existente sin pedir
  permiso a la usuaria y recibir un «sí» explícito para ese cambio. Una solicitud general
  de implementación o refactoring MUST NOT interpretarse como ese consentimiento.

Esta protección preserva las expectativas existentes durante todo el flujo SDD.

### VI. Definición de terminado y entregable

Un requerimiento MUST considerarse terminado únicamente cuando:

- Tiene tests unitarios y de integración, con casos felices y borde, y todos pasan.
- La aplicación compila y levanta con la configuración local.
- La colección de Postman del proyecto está actualizada con los endpoints nuevos.
- Swagger/OpenAPI está actualizado si el requerimiento agrega o modifica endpoints,
  conforme a la documentación obligatoria del enunciado.

La evidencia de estas verificaciones MUST acompañar el cierre del requerimiento.

### VII. Idioma

Los documentos y mensajes de error MUST estar en español.
Los nombres del dominio MUST estar en español y MUST NOT incluir acentos ni ñ en
identificadores. Los términos técnicos y normativos MUST mantenerse en inglés.

### VIII. Operaciones transaccionales

Las operaciones de compra y venta que modifiquen más de un estado relacionado MUST
ser atómicas: o se completa toda la operación o no se persiste ningún cambio parcial.
La disponibilidad, la posición, el saldo y la operación registrada MUST quedar
consistentes como parte de la misma operación.

### IX. Integraciones externas y continuidad con datos locales

Las APIs externas MUST consumirse mediante Adapters. Controllers, modelos de dominio y
Repositories MUST NOT consumirlas directamente.
Una caída del proveedor externo MUST NOT romper las funcionalidades que puedan
resolverse con datos locales o cacheados. Los Services MUST coordinar el uso de los
Adapters y los datos locales respetando las responsabilidades de cada capa.

## Alcance y decisiones pendientes

Esta constitución gobierna el proyecto de valoración de mercado de jugadores de fútbol
y sus entregas incrementales. Las especificaciones MUST delimitar el alcance de cada
requerimiento conforme al enunciado y la entrega correspondiente.

El paquete end to end con Supertest queda pendiente de definición detallada en un plan
posterior. Esta decisión pendiente MUST NOT relajar la separación respecto de los tests
de Service ni la protección de tests existentes.

## Flujo de desarrollo y revisión

El proyecto MUST utilizar el flujo SDD de Spec Kit: especificación, plan, tareas e
implementación, avanzando por requerimientos acotados.
Las especificaciones, planes, tareas y revisiones MUST comprobar el cumplimiento de
esta constitución. Los planes MUST identificar las capas involucradas, los tests
necesarios y los cambios de documentación exigidos por la definición de terminado.

Si un cambio requiere modificar o eliminar un test existente, se MUST describir el
cambio concreto y obtener el «sí» explícito antes de ejecutarlo, en cualquier etapa.
Los requisitos aún no implementados o las verificaciones que no pudieron ejecutarse
MUST quedar informados; MUST NOT presentarse como completados.

## Governance

Esta constitución es la referencia normativa del proyecto. Ante una contradicción con
una especificación, plan, tarea o implementación, se MUST corregir el artefacto o
proponer una enmienda explícita; MUST NOT ignorarse silenciosamente la regla.

Toda enmienda MUST documentar el motivo, las reglas afectadas y su impacto en los
artefactos existentes, y actualizar el Sync Impact Report, la versión y la fecha de
última modificación. Los cambios de reglas MUST contar con aprobación explícita de la
usuaria; una instrucción explícita de actualización constituye dicha aprobación.

Se MUST utilizar semantic versioning: MAJOR para eliminar o redefinir reglas de forma
incompatible; MINOR para agregar principios o ampliar obligaciones; PATCH para
aclaraciones que no cambien su significado. Cada revisión de un requerimiento MUST
comprobar el cumplimiento de los principios y la definición de terminado.

**Version**: 1.0.0 | **Ratified**: 2026-09-06 | **Last Amended**: 2026-09-06
