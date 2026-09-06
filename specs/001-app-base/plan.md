# Implementation Plan: App base del backend

**Branch**: `main` (Git); funcionalidad `001-app-base`.
**Date**: 2026-09-06
**Spec**: [spec.md](spec.md)
**Status**: Plan completo; listo para speckit-tasks.

## Summary

Crear una aplicación NestJS con TypeScript y npm en `backend/`. Exponer GET /health
sin autenticación, con HTTP 200 y JSON exactamente {"status":"ok"}. El Controller
delega en un Service. Documentar en Swagger/OpenAPI y Postman. No incluir persistencia,
autenticación, jugadores, proveedores externos ni frontend.

## Technical Context

**Language/Version**: Node.js 22.11.0, TypeScript strict,
CommonJS. NestJS 11.x (compatibilidad con Swagger verificada al instalar). Fijar versiones concretas compatibles en package-lock.json al
implementar; no utilizar versiones flotantes en los comandos de generación documentados.
**Primary Dependencies**: npm, NestJS/Express, @nestjs/config, @nestjs/swagger;
@nestjs/testing y Jest para tests. Verificar peer dependencies al instalar.
**Storage**: Ninguno.
**Testing**: Unitarios de validación de entorno; integración del módulo Nest con
Controller, Service y configuración reales. Sin PostgreSQL ni Testcontainers por
constitución 2.0.0. Verificación HTTP manual del servidor compilado y desde Postman.
No se implementa suite end to end en esta etapa; si se agrega posteriormente, deberá
usar Supertest en un paquete propio. No se usa un cliente HTTP dentro de tests de Service.
**Target Platform**: Windows/PowerShell; scripts npm portables.
**Project Type**: Backend REST.
**Performance Goals**: Diez consultas consecutivas exitosas y disponibilidad tras reiniciar;
sin nuevos SLAs ni pruebas de carga.
**Constraints**: Configuración sin secretos, documentación y errores propios en español.
**Scale/Scope**: Un endpoint de salud y rutas de documentación.

### Entorno y arranque

El equipo actualmente tiene Node 22.11.0 y npm 10.9.0. Se conserva este runtime por decisión de la usuaria.
Versionar package-lock.json, declarar engines y documentar npm ci. En implementación,
generar el scaffolding sin inicializar Git anidado y sin tests de ejemplo, para no crear
tests destinados a ser borrados. Agregar directamente los tests propios del alcance.

PORT ausente utiliza 3000. Si está presente, validar cadena decimal de entero 1–65535;
rechazar vacío, texto, decimales, cero, negativos y valores superiores a 65535.
Cargar opcionalmente backend/.env; el entorno del proceso prevalece. Versionar .env.example,
con PORT=3000, pero no exigir su copia para arrancar.

Anunciar disponibilidad solo después de resolver listen(). En error, informar en español
y salir con código no cero. Ante puerto ocupado, sugerir cambiar PORT. Eliminar rutas
Hello World del scaffolding antes de crear los tests propios.

### Capas y documentación

HealthModule registra HealthController y HealthService. HealthController usa un DTO de
respuesta y delega en HealthService; el Service devuelve el estado y no depende del DTO
HTTP. No hay DTO de request vacío, entidades, Repositories ni Adapters artificiales.
Health y status son términos técnicos.

Separar la configuración compartida de la aplicación del arranque del proceso para
poder probar el mismo módulo con @nestjs/testing. Un filtro HTTP garantiza mensajes
propios en español, preserva los códigos de error y no expone stack traces.

Swagger UI: /docs. OpenAPI 3 JSON: /docs-json. Contrato de referencia en
[contracts/openapi.yaml](contracts/openapi.yaml); el documento generado debe coincidir
en ruta, método, ausencia de autenticación y schema de respuesta. Postman tendrá
baseUrl=http://localhost:3000 y verificaciones de status, Content-Type y cuerpo exacto.

## Constitution Check

**Previo a Phase 0: PASS**, tras aclaración explícitamente autorizada e incorporada a
la constitución 2.0.0. **Posterior a Phase 1: PASS** sobre el diseño, no sobre código ejecutado.

| Principio | Cumplimiento previsto |
|-----------|-----------------------|
| I. Stack | NestJS/TypeScript; no se incorpora persistencia ni frontend. |
| II. Capas | Controller -> Service y DTO de respuesta; sin acceso directo a infraestructura. |
| III. Modelo rico | No hay entidades ni reglas de negocio que modelar. |
| IV. Validaciones | Validación de configuración al inicio; no hay input de negocio en health. |
| V. Tests | Unitarios e integración de componentes sin persistencia; conservar tests existentes. |
| VI. Terminado | Tests felices/borde, build, arranque, Swagger y Postman con evidencia. |
| VII. Idioma | Documentos y errores propios en español; términos técnicos en inglés. |
| VIII. Atomicidad | No hay transacciones. |
| IX. Adapters | No hay servicios externos. |

La actualización de V exige PostgreSQL/Testcontainers cuando haya persistencia. No elimina
la obligación de tests de integración ni la protección de tests existentes.

## Project Structure

### Documentation (this feature)

```text
specs/001-app-base/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/openapi.yaml
  checklists/requirements.md
```

### Source Code (repository root)

Estructura a crear durante implement:

```text
backend/
  package.json
  package-lock.json
  nest-cli.json
  tsconfig.json
  tsconfig.build.json
  .env.example
  src/
    main.ts
    configure-app.ts
    app.module.ts
    config/environment.ts
    common/filters/http-exception.filter.ts
    health/
      health.module.ts
      health.controller.ts
      health.service.ts
      dto/health-response.dto.ts
  test/
    unit/environment.spec.ts
    integration/app-module.spec.ts
  jest.config.ts
docs/postman/app-base.postman_collection.json
README.md
```

**Structure Decision**: backend/ separa la API de los documentos SDD y permite agregar
frontend después. No se necesita workspace npm ni monorepo tooling. El nombre exacto
del archivo de configuración Jest se ajustará al scaffolding CommonJS elegido.

## Complexity Tracking

No hay excepciones pendientes ni complejidad adicional que justificar.

## Estrategia de verificación y trazabilidad

| Requisitos | Evidencia prevista |
|------------|--------------------|
| FR-001, FR-002, FR-006 | npm ci, build, arranque del compilado y README desde copia limpia. |
| FR-003, FR-004 | Integración: resolver Controller y Service reales mediante AppModule sin DB; consulta manual HTTP y Postman. |
| FR-005 | Unitarios: ausente, 1, 65535, 3000, vacío, texto, 0, negativos, decimales, 65536; integración de configuración válida/inválida; prueba manual de puerto ocupado. |
| FR-007 | Verificar schema generado y colección, abrir Swagger y ejecutar petición Postman. |
| FR-008 | Petición manual a ruta inexistente: 404 y mensaje en español. |
| FR-009 | Unitarios e integración verdes con casos felices y borde, sin tocar tests existentes. |
| FR-010 | Inspección de dependencias y arranque sin DB, secretos ni servicios externos. |

Los tests de integración comprobarán composición e inyección reales, configuración por
defecto y rechazo de configuración inválida; limpiarán entorno y cerrarán módulos al terminar.
No se duplican tests de constantes. El contrato de la red se verifica contra el proceso
compilado, incluyendo diez consultas, detención y reinicio; estas comprobaciones manuales
no se presentan como suite end to end automatizada.

Phase 0 y Phase 1 completas. No hay hooks registrados. No se generaron tareas ni código
ni se ejecutaron tests de la aplicación. Continuar con speckit-tasks.



