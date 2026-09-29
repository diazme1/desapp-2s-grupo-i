# Implementation Plan: Autenticación del frontend

**Branch**: `006-auth-frontend` | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-auth-frontend/spec.md`

## Summary

Se incorporará una aplicación web independiente en `frontend/`, construida con Vite,
React y TypeScript. La aplicación tendrá pantallas de registro y login, validación local,
sesión autenticada, cierre de sesión y una pantalla protegida provisional. Consumirá los
endpoints existentes de autenticación del backend mediante HTTP/REST, reutilizando el
contrato definido en `specs/002-usuarios-autenticacion-jwt/contracts/openapi.yaml`.

La implementación prioriza un flujo vertical verificable: una persona puede registrarse,
iniciar sesión, recargar la aplicación conservando una sesión válida, cerrar sesión y
recibir mensajes seguros ante errores.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 22.x

**Primary Dependencies**: Vite, React, React Router, Vitest, Testing Library y jsdom

**Storage**: `sessionStorage` del navegador únicamente para la sesión temporal; no se
persisten contraseñas

**Testing**: Vitest, Testing Library, user-event y pruebas de build de Vite

**Target Platform**: Navegadores modernos en desktop y mobile; desarrollo local con
backend en `http://localhost:3000`

**Project Type**: Aplicación web frontend separada del servicio backend existente

**Performance Goals**: Mostrar estado de procesamiento inmediatamente y completar la
transición de una operación autenticada en menos de 2 segundos cuando el backend responde
en condiciones normales

**Constraints**: No usar refresh tokens, OAuth, login social ni contraseña recuperable en
esta feature. No exponer contraseñas ni credenciales completas. Mantener el frontend
usable con teclado y viewport móvil.

**Scale/Scope**: Tres rutas principales de autenticación (`/login`, `/register` y una ruta
protegida provisional), una sesión por pestaña y un único contrato de usuario autenticado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Stack tecnológico**: PASS. El frontend utiliza React y TypeScript, con Vite como
  herramienta de desarrollo y build, y se comunica mediante HTTP/REST.
- **Arquitectura separada**: PASS. La UI, la capa de autenticación y el cliente HTTP se
  mantienen en `frontend/`; el backend no incorpora lógica de presentación.
- **Cada validación en su nivel**: PASS. La interfaz valida forma y experiencia de uso;
  el backend continúa siendo responsable de autorización, identidad y reglas finales.
- **Seguridad**: PASS. No se guardan contraseñas, se evita mostrar el token completo y se
  limpia la sesión ante rechazo o vencimiento.
- **Tests y definición de terminado**: PASS. Se agregan pruebas de formularios, cliente de
  auth, guardas de ruta y build del frontend sin modificar tests existentes del backend.
- **Idioma**: PASS. Los textos de usuario y documentación de la feature estarán en español;
  los identificadores de código no usarán acentos ni `ñ`.

## Project Structure

### Documentation (this feature)

```text
specs/006-auth-frontend/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── frontend-auth-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   └── ProtectedRoute.tsx
    ├── auth/
    │   ├── auth-api.ts
    │   ├── auth-context.tsx
    │   ├── auth-storage.ts
    │   ├── auth-types.ts
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── AuthLayout.tsx
    │   └── auth.css
    ├── shared/
    │   └── http-client.ts
    └── test/
        ├── setup.ts
        ├── auth-api.test.ts
        ├── LoginPage.test.tsx
        ├── RegisterPage.test.tsx
        └── AuthContext.test.tsx
```

**Structure Decision**: Se elige una aplicación Vite independiente dentro de `frontend/`
porque el repositorio ya separa el backend en `backend/` y todavía no tiene workspace
frontend. La feature de autenticación se mantiene agrupada bajo `src/auth/` para que las
próximas features del mercado puedan reutilizar la sesión sin mezclar sus componentes.

## Phase 0: Research

Las decisiones técnicas y sus alternativas se documentan en [research.md](research.md).
No quedan decisiones bloqueantes sin resolver: Vite + React + TypeScript, React Router,
`sessionStorage`, proxy de desarrollo y pruebas con Vitest/Testing Library quedan fijados
para esta implementación.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md) define los formularios, usuario público, respuesta de
  token y ciclo de vida de la sesión.
- [contracts/frontend-auth-contract.md](contracts/frontend-auth-contract.md) define rutas,
  campos, estados visibles y mapeo con los endpoints backend existentes.
- [quickstart.md](quickstart.md) documenta cómo levantar backend y frontend y cómo probar
  los escenarios principales.

## Complexity Tracking

No se identifican violaciones a la constitución ni complejidad excepcional que requiera
justificación.
