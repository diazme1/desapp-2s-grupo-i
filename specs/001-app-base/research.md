# Investigación técnica: app base

## Runtime y herramientas

**Decision**: Node 24 LTS (mínimo 24.15), NestJS 12.x, TypeScript strict, npm y CommonJS.
**Rationale**: La documentación actual del CLI pide un runtime más nuevo que el Node
22.11.0 instalado. CommonJS facilita la configuración con Jest. Fijar las revisiones
compatibles del momento de implementación en el lockfile y documentar las versiones usadas.
**Alternatives considered**: Node 22 actualizado también es posible, pero se elige 24 LTS;
ESM requiere otras decisiones de tooling; pnpm no coincide con el pedido de npm.
**Sources**: [Nest releases](https://github.com/nestjs/nest/releases/tag/v12.0.0),
[Nest first steps](https://docs.nestjs.com/first-steps),
[Node releases](https://nodejs.org/en/about/previous-releases).

## Configuración

**Decision**: @nestjs/config, PORT opcional con valor 3000 y validación de entero 1–65535.
**Rationale**: Permite rechazar configuraciones inválidas antes de escuchar; .env opcional
y precedencia del entorno permiten ejecutar sin editar código.
**Alternatives considered**: Conversión numérica sin validación admite valores inválidos;
una librería de schemas adicional no es necesaria para una sola variable.
**Source**: [Nest configuration](https://docs.nestjs.com/techniques/configuration).

## Documentación

**Decision**: @nestjs/swagger con DTO de respuesta, UI /docs y JSON /docs-json;
colección Postman versionada con baseUrl configurable.
**Rationale**: Cumple el contrato solicitado y la definición de terminado.
**Alternatives considered**: Solo documentación textual no permite probar desde Swagger;
agregar autenticación o endpoints de negocio excede el alcance.
**Source**: [Nest OpenAPI](https://docs.nestjs.com/openapi/introduction).

## Pruebas sin persistencia

**Decision**: Unitarios de configuración e integración del contenedor Nest con componentes
reales, sin cliente HTTP dentro de tests de Service; validación HTTP manual del compilado.
**Rationale**: La usuaria autorizó la aclaración incorporada en la constitución 2.0.0.
El componente de salud no depende de persistencia. Los casos borde se concentran en
configuración y arranque, donde sí hay comportamiento variable.
**Alternatives considered**: PostgreSQL artificial contradice el alcance; solo unitarios
incumple la definición de terminado; una suite end to end se reserva para su propio paquete
cuando se defina esa etapa. El plan no sustituye integración por mocks de todos los componentes.
**Source**: Constitución del proyecto, principios V y VI.

No quedan decisiones abiertas que impidan generar tareas.

## Ajuste verificado durante implementación

El registro npm rechazó NestJS 12.0.1 junto con @nestjs/swagger 11.4.7, cuyo peer
@nestjs/common requiere ^11.0.1. Se adopta NestJS 11 para runtime y testing,
conservando Node 24 y el scaffolding CommonJS generado por schematics 12.0.0.
No se fuerza la instalación ni se ignoran peer dependencies.

## Cambio solicitado: Node 22.11.0

Se conserva el Node instalado de la usuaria y se fijan CLI/schematics 11.0.5,
TypeScript 5.7.3, tipos Node 22.10.2 y oxlint 1.0.0. Esta decisión reemplaza
la recomendación anterior de Node 24. La instalación con engine-strict y las
verificaciones deben completarse antes de considerar validada la combinación.
