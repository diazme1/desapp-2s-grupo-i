# Research: Autenticación del frontend

## Decision: Vite + React + TypeScript

**Rationale**: Coincide con el stack declarado por la constitución y permite crear una
aplicación frontend independiente, con desarrollo rápido y un build estático simple.

**Alternatives considered**: Crear el frontend dentro del backend, usar un framework
full-stack o incorporar una herramienta de componentes pesada. Se descartan porque
mezclarían responsabilidades o agregarían dependencias innecesarias para login y registro.

## Decision: React Router para navegación y protección de rutas

**Rationale**: Login, registro y la pantalla posterior al login son destinos distintos y
requieren impedir el acceso directo a la ruta protegida cuando no hay sesión válida.

**Alternatives considered**: Navegación manual por estado o una única pantalla condicional.
Se descartan porque dificultan los enlaces directos, el botón atrás y las pruebas de rutas.

## Decision: sessionStorage para la credencial temporal

**Rationale**: Mantiene la sesión durante una recarga de la pestaña, pero la elimina al
cerrar esa pestaña. Es adecuado para el alcance educativo actual, que no implementa refresh
tokens ni una opción de "recordarme".

**Alternatives considered**: localStorage, que prolongaría la persistencia de un token
temporal; cookies HttpOnly, que exigirían cambios de contrato y configuración en backend.

## Decision: fetch encapsulado y proxy de Vite

**Rationale**: El cliente HTTP centraliza el encabezado Bearer y el manejo de respuestas
401/403. El proxy `/api` de Vite evita problemas de CORS durante el desarrollo sin cambiar
el backend; la URL base queda configurable para otros entornos.

**Alternatives considered**: Axios y habilitar CORS como primer paso. Se descartan Axios
por no ser necesario para este alcance y CORS como requisito de desarrollo cuando el proxy
resuelve el flujo local.

## Decision: Vitest + Testing Library

**Rationale**: Permiten verificar comportamiento observable de formularios, mensajes,
estados de carga y protección de rutas sin acoplar las pruebas a detalles internos.

**Alternatives considered**: Probar solamente el build o incorporar un navegador end to
end desde el inicio. El build no cubre interacción y un paquete end to end ampliaría el
alcance de esta feature; se deja como posible etapa posterior.

## Decision: Registro no inicia sesión automáticamente

**Rationale**: El contrato actual de `POST /auth/register` devuelve el usuario público,
pero no un token. La interfaz confirmará el alta y llevará al login, sin inventar una
sesión que el backend no emitió.
