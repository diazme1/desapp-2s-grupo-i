# Verificación de compatibilidad con Node 22.11.0

- Runtime utilizado: Node 22.11.0, npm 10.9.0 del sistema, sin .tools.
- Instalación completada con --engine-strict; lockfile actualizado.
- CLI y schematics 11.0.5; TypeScript 5.7.3; oxlint 1.0.0.
- npm run build: correcto. Se desactivó incremental en tsconfig.build.json para evitar
  que el borrado de dist del CLI conserve metadatos de una compilación previa.
- npm run test:unit: 12 tests correctos.
- npm run test:integration: 4 tests correctos. No se modificaron tests existentes.
- npm start: correcto; GET /health devolvió HTTP 200 y {"status":"ok"}.
- Se detuvo la instancia de prueba para liberar el puerto.
- npm informó 9 vulnerabilidades en el árbol de dependencias (1 baja, 5 moderadas,
  3 altas). No se aplicó audit fix --force ni se verificó aún su alcance.

## Ejecución de T007 — 2026-09-09

Se repitieron las verificaciones desde el repositorio actual en Windows/PowerShell.

- `node --version`: `v22.11.0`.
- `npm.cmd --version`: `10.9.0`.
- `npm.cmd ci` no pudo completar la limpieza de `backend/node_modules` por un bloqueo
  del sistema (`ENOTEMPTY`/`EPERM`). Se eliminó únicamente esa carpeta regenerable y
  `npm.cmd ci --ignore-scripts` terminó correctamente (603 paquetes, 0 vulnerabilidades).
- `npm.cmd run build`: correcto.
- `npm.cmd run test:unit`: 12 tests correctos.
- `npm.cmd run test:integration`: 4 tests correctos.

El puerto 3000 ya estaba ocupado por un proceso previo (PID 14184), que no se detuvo.
Para no interferir con él, las pruebas de proceso se ejecutaron en el puerto 3100:

- Arranque del compilado (`node dist/main.js`): correcto.
- `GET /health`: HTTP 200, `application/json; charset=utf-8` y cuerpo exacto
  `{"status":"ok"}`.
- Diez consultas consecutivas a `/health`: 10 respuestas HTTP 200.
- Detención y reinicio en el mismo puerto: correcto; volvió a responder HTTP 200.
- Petición con el servidor detenido: falló la conexión.
- Puerto alternativo 3100: respondió HTTP 200 con el contrato esperado.
- Segundo proceso en un puerto ocupado: terminó con código 1 y el mensaje
  `El puerto está ocupado. Elegí otro valor de PORT.`
- Puerto inválido (`PORT=invalido`): terminó con código 1 y el mensaje
  `PORT debe ser un entero entre 1 y 65535.`
- Ruta inexistente: HTTP 404 con `Ruta no encontrada.`.
- `/docs` y `/docs-json`: HTTP 200; OpenAPI contiene `/health` y no declara seguridad.
- La colección de Postman existe, usa `baseUrl=http://localhost:3000`, contiene una
  petición y scripts de comprobación. No se ejecutó la aplicación gráfica de Postman.

T007 queda parcialmente verificada: falta repetir `npm ci` sin `--ignore-scripts` en un
entorno sin el bloqueo de Windows y ejecutar la colección desde Postman. Las demás
comprobaciones de la guía quedaron registradas arriba; no se modificaron tests existentes.
