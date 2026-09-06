# Tasks: App base del backend

Basado en [spec.md](spec.md), [plan.md](plan.md) y la constitución 2.0.0.
Las siete tareas están pendientes. Los detalles técnicos y casos de aceptación permanecen
en el plan y en [quickstart.md](quickstart.md).

## 1. Crear el proyecto

- [X] T001 Generar la app NestJS con TypeScript y npm en backend/.

Verificar el runtime y las versiones compatibles indicadas en el plan. Usar TypeScript
strict, CommonJS y un package-lock.json versionado. Preparar los scripts de build,
arranque y tests en backend/package.json. Conservar el Git existente y evitar generar
tests de ejemplo que después haya que borrar.

**Resultado:** estructura base creada y dependencias instaladas.

## 2. Configurar el arranque — US1

- [ ] T002 [US1] Configurar backend/src/main.ts, backend/src/app.module.ts, backend/src/config/environment.ts y backend/.env.example.

Usar PORT con valor predeterminado 3000 y .env opcional. Validar el puerto según el plan,
respetar la precedencia del entorno y mostrar errores de arranque en español.
Separar la configuración compartida en backend/src/configure-app.ts.

**Resultado:** la app arranca, se detiene y reinicia; un puerto inválido u ocupado produce
un error visible y no anuncia disponibilidad.

## 3. Crear el endpoint de salud — US2

- [ ] T003 [US2] Implementar Controller, Service, módulo y DTO de respuesta en backend/src/health/.

GET /health delega del Controller al Service y devuelve HTTP 200 con exactamente
`{"status":"ok"}`. Registrar el módulo en backend/src/app.module.ts. Configurar los
errores HTTP en backend/src/common/filters/http-exception.filter.ts: rutas inexistentes
responden 404 con mensaje en español, sin exponer stack traces.

**Resultado:** health responde sin autenticación, base de datos ni servicios externos.

## 4. Agregar los tests — US1 y US2

- [ ] T004 Crear los tests unitarios en backend/test/unit/ y de integración en backend/test/integration/, con configuración Jest en backend/jest.config.ts o .cjs.

Cubrir los valores válidos, ausentes e inválidos de PORT definidos en el plan; comprobar
la configuración e inyección reales del módulo y la respuesta de salud. Usar casos
felices y borde, restaurar el entorno y cerrar los módulos al terminar. No requerir DB,
no usar clientes HTTP dentro de tests de Service ni agregar una suite end to end.

**Resultado:** test:unit y test:integration pasan; ninguna suite vacía cuenta como éxito.
No modificar ni borrar un test existente sin el «sí» explícito de la usuaria.

## 5. Configurar Swagger y Postman — US3

- [ ] T005 [US3] Configurar Swagger en backend/src/configure-app.ts y documentar el endpoint/DTO en backend/src/health/; crear docs/postman/app-base.postman_collection.json.

Exponer Swagger en /docs y OpenAPI 3 en /docs-json, respetando
[contracts/openapi.yaml](contracts/openapi.yaml). La colección usa baseUrl configurable
e incluye comprobaciones de status HTTP, contenido JSON y cuerpo exacto.

**Resultado:** el endpoint se puede consultar y probar desde Swagger y Postman.

## 6. Escribir las instrucciones — US3

- [ ] T006 [US3] Escribir README.md con los pasos necesarios para trabajar con la app.

Incluir versiones/prerrequisitos, instalación, compilación, arranque, detención, PORT,
tests, Swagger, Postman y solución de los errores previstos. Usar español y comandos
que funcionen desde la ubicación indicada.

**Resultado:** otro integrante puede levantar y probar el backend siguiendo el README.

## 7. Verificar que todo funciona

- [ ] T007 Ejecutar specs/001-app-base/quickstart.md y registrar los resultados en specs/001-app-base/validation.md.

Comprobar instalación desde copia limpia, build, tests y arranque del compilado.
Verificar diez consultas a health, reinicio, puerto alternativo, puerto inválido/ocupado,
404, Swagger y Postman. Reutilizar verificaciones previas válidas sin repetirlas si no
hubo cambios. Registrar cualquier prueba no realizada y marcar únicamente las tareas
completadas en este archivo.

**Resultado:** evidencia de que la app cumple la especificación y la definición de terminado.

## Orden de trabajo

Seguir T001 → T002 → T003 → T004 → T005 → T006 → T007, paso por paso.
Los tests pueden escribirse durante T002/T003; T004 agrupa su cobertura y ejecución.
T005 y T006 pueden realizarse en paralelo una vez acordadas las rutas y los comandos,
pero para este primer avance se recomienda el orden secuencial.

El primer hito es la app arrancando (US1); el siguiente es health respondiendo (US2).
El requerimiento termina cuando también están la documentación (US3) y la verificación final.
No incluye base de datos, autenticación, jugadores ni frontend.

