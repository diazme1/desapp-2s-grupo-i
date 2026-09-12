# Implementation Plan: Usuarios y autenticación con JWT

**Branch**: `feat/auth` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-usuarios-autenticacion-jwt/spec.md`

## Summary

Agregar registro e inicio de sesión con correo y contraseña, emitir JWT con vencimiento y
proteger los endpoints que dependan de la identidad. El backend obtendrá el usuario desde
el JWT y comprobará la propiedad de los datos antes de consultar o modificar información.
La persistencia usará PostgreSQL mediante repositorios; la contraseña se almacenará como
hash y el secreto del JWT se cargará desde la configuración del entorno. `/health` seguirá
siendo público y no se usarán API keys.

## Technical Context

**Language/Version**: Node.js 22.11.0, TypeScript strict, CommonJS.

**Primary Dependencies**: NestJS 11, `@nestjs/jwt`, `@nestjs/typeorm`, TypeORM, `pg`,
`bcryptjs`, `class-validator`, `class-transformer` y `@nestjs/config`.

**Storage**: PostgreSQL con migración para usuarios; las pruebas de persistencia usarán un
PostgreSQL real levantado con Testcontainers.

**Testing**: Jest; unitarios de dominio y servicios sin NestJS ni base de datos cuando sea
posible, integración de repositorios, autenticación y autorización con PostgreSQL/
Testcontainers.

**Target Platform**: Backend REST ejecutado en Windows/PowerShell y GitHub Actions.

**Project Type**: Backend web-service.

**Performance Goals**: Login y validación de token con respuesta determinista en el entorno
local; no se agrega un SLA de producción en esta feature.

**Constraints**: No guardar contraseñas en texto plano; no escribir secretos o tokens en
logs; no usar API keys; rechazar configuración insegura; mantener `/health` público; no
confiar en un `userId` del cliente; no modificar ni eliminar tests existentes.

**Scale/Scope**: Registro, login, JWT Bearer, autorización por propietario y consulta de
identidad para la primera entrega. No incluye recuperación de contraseña, refresh tokens,
OAuth ni roles administrativos.

## Constitution Check

*GATE: PASS before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento |
|---|---|
| I. Stack tecnológico | PASS: NestJS/TypeScript y PostgreSQL. |
| II. Arquitectura en capas | PASS: Controller -> Service -> Domain Model / Repository. |
| III. Modelo rico | PASS: las reglas de identidad y propiedad viven en el dominio; el hash se delega a un servicio especializado. |
| IV. Cada validación en su nivel | PASS: DTO valida forma; Service coordina existencia y propiedad; dominio protege invariantes. |
| V. Tests y protección | PASS: unitarios sin infraestructura; integración con PostgreSQL/Testcontainers; tests existentes intactos. |
| VI. Definición de terminado | PASS: tests, build, Swagger, Postman y evidencia documentada. |
| VII. Idioma | PASS: documentación y errores propios en español; términos técnicos en inglés. |
| VIII. Operaciones transaccionales | PASS: el registro modifica una identidad de forma atómica; las operaciones de mercado quedan fuera de alcance. |
| IX. Integraciones externas | PASS: no hay proveedor externo en esta feature. |
| Producto | PASS: no se modifican las invariantes de `docs/product.md`; el usuario será base para operaciones futuras. |

## Project Structure

### Documentation (this feature)

```text
specs/002-usuarios-autenticacion-jwt/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/jwt-auth.guard.ts
│   │   └── strategies/
│   │       ├── jwt-token.service.ts
│   │       └── password-hasher.ts
│   ├── users/
│   │   ├── domain/user.ts
│   │   ├── users.module.ts
│   │   ├── users.repository.ts
│   │   └── persistence/typeorm-user.repository.ts
│   ├── config/environment.ts
│   └── app.module.ts
├── migrations/
└── test/
    ├── unit/auth/
    ├── unit/users/
    └── integration/auth/
```

**Structure Decision**: La feature se agrega como módulos `auth` y `users` dentro del
backend existente. `auth` orquesta credenciales, JWT y autorización; `users` contiene el
modelo y el repositorio. Ningún Controller accede directamente a TypeORM.

## Complexity Tracking

No hay violaciones constitucionales que justificar.
