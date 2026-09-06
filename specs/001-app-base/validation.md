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

Esta verificación confirma el cambio de runtime. No acredita la verificación final
completa de T007 (copia limpia, Swagger/Postman y todos los casos HTTP).
