# Feature Specification: Integración continua del proyecto

**Feature Branch**: `feature/config-ci`

**Created**: 2026-09-13

**Status**: Draft

**Input**: Configurar Continuous Integration para validar automáticamente los cambios enviados a `main` y `dev`, y las Pull Requests dirigidas a cualquiera de esas ramas. La validación debe cubrir compilación, tests unitarios, tests de integración con persistencia real cuando corresponda, análisis de calidad y seguridad con SonarQube Cloud y su Quality Gate, construcción y ejecución de la imagen de la aplicación, y disponibilidad de `GET /health`, con fallos bloqueantes y diagnóstico de errores de startup.

## Contexto de producto

Esta feature protege la calidad de Football Player Market antes de integrar cambios. Debe respetar [docs/product.md](../../docs/product.md), la Constitución vigente y, en particular, la separación entre tests unitarios, tests de integración y el paquete end-to-end aún pendiente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Validar automáticamente cambios integrables (Priority: P1)

Como integrante del equipo, quiero que cada cambio relevante se valide automáticamente para saber si conserva una versión compilable y verificable antes de incorporarlo a las ramas compartidas.

**Why this priority**: Es la protección básica contra integrar código que no compila o rompe verificaciones existentes.

**Independent Test**: Enviar cambios mediante cada uno de los cuatro eventos incluidos y comprobar que se inicia una validación; introducir de forma controlada una falla de compilación o de tests y comprobar que el resultado final es fallido.

**Acceptance Scenarios**:

1. **Given** un cambio enviado directamente a `main`, **When** el repositorio recibe el push, **Then** se inicia una ejecución completa del CI.
2. **Given** un cambio enviado directamente a `dev`, **When** el repositorio recibe el push, **Then** se inicia una ejecución completa del CI.
3. **Given** una Pull Request cuya rama de destino es `main`, **When** se crea o actualiza la propuesta, **Then** se inicia una ejecución completa del CI sobre el cambio propuesto.
4. **Given** una Pull Request cuya rama de destino es `dev`, **When** se crea o actualiza la propuesta, **Then** se inicia una ejecución completa del CI sobre el cambio propuesto.
5. **Given** una ejecución iniciada por un evento incluido, **When** la compilación o cualquier verificación obligatoria falla, **Then** el resultado final del CI es fallido y la causa puede identificarse en la ejecución.

---

### User Story 2 - Verificar compilación y suites de tests (Priority: P1)

Como integrante del equipo, quiero que el CI ejecute las verificaciones de código existentes en entornos adecuados para detectar regresiones de lógica y persistencia de manera confiable.

**Why this priority**: La confianza en los cambios depende de comprobar tanto el comportamiento aislado como la integración real con persistencia, sin debilitar la cobertura existente.

**Independent Test**: Ejecutar el CI con un cambio válido y comprobar que compila y que pasan por separado las suites unitarias y de integración; repetir con una falla controlada en cada categoría y comprobar que cada una vuelve fallida la ejecución.

**Acceptance Scenarios**:

1. **Given** una revisión incluida, **When** se ejecuta el CI, **Then** la aplicación debe compilar correctamente para que la ejecución pueda aprobarse.
2. **Given** que existen tests unitarios, **When** se ejecuta el CI, **Then** todos se ejecutan sin depender de infraestructura y deben aprobar para que el CI resulte exitoso.
3. **Given** que existen tests de integración, **When** se ejecuta el CI, **Then** todos se ejecutan y deben aprobar para que el CI resulte exitoso.
4. **Given** un test de integración que involucra persistencia, **When** se ejecuta en el CI, **Then** utiliza una instancia real y aislada de PostgreSQL provista mediante Testcontainers.
5. **Given** que Testcontainers necesita crear y administrar contenedores, **When** se ejecutan los tests de integración en el CI, **Then** dispone de acceso funcional a Docker y puede completar su ciclo de vida sin configuración manual externa.
6. **Given** cualquier test existente, **When** se incorpora esta feature, **Then** el test permanece habilitado, sin modificaciones, eliminaciones ni omisiones salvo aprobación explícita de la usuaria.

---

### User Story 3 - Comprobar que el entregable levanta y responde (Priority: P1)

Como integrante del equipo, quiero validar el artefacto ejecutable de la aplicación para detectar antes de integrar problemas de empaquetado, configuración o arranque que no aparecen durante la compilación y los tests.

**Why this priority**: La definición de terminado exige no solo compilar, sino también iniciar la aplicación correctamente y comprobar que el servidor está disponible.

**Independent Test**: Construir la imagen en el CI, iniciar un contenedor a partir de esa misma imagen y consultar `GET /health`; comprobar además que un arranque fallido termina dentro del límite definido y conserva logs útiles.

**Acceptance Scenarios**:

1. **Given** que la compilación y los tests son exitosos, **When** se construye la imagen Docker de la aplicación, **Then** la construcción finaliza correctamente sin publicar la imagen en un registry.
2. **Given** la imagen construida por la ejecución actual, **When** se inicia un contenedor a partir de ella, **Then** el proceso de la aplicación permanece activo durante la verificación de salud.
3. **Given** un contenedor iniciado correctamente, **When** el servidor queda disponible dentro del límite establecido, **Then** una solicitud HTTP `GET /health` recibe estado `200` y la verificación aprueba.
4. **Given** un contenedor que no inicia, termina prematuramente o no responde a tiempo, **When** se alcanza una condición de error o el timeout finito, **Then** el CI falla y muestra los logs del contenedor para diagnosticar el startup.

---

### User Story 4 - Controlar calidad y seguridad antes de integrar (Priority: P1)

Como integrante del equipo, quiero que cada cambio incluido sea analizado por SonarQube Cloud y sometido a su Quality Gate para evitar integrar problemas de calidad o seguridad que excedan los criterios aceptados por el proyecto.

**Why this priority**: La compilación y los tests no detectan por sí solos todas las degradaciones de mantenibilidad, confiabilidad y seguridad; el Quality Gate agrega una condición obligatoria y visible para decidir si un cambio es integrable.

**Independent Test**: Ejecutar el CI con un push incluido o una Pull Request originada en una rama del mismo repositorio, primero con un cambio cuyo Quality Gate aprueba y luego con otro que lo hace fallar; comprobar que el resultado se refleja en el estado final del CI y queda asociado al cambio en GitHub. Cuando uno o ambos reportes de coverage estén disponibles, comprobar además que el análisis los incorpora. En una Pull Request desde un fork, comprobar que las validaciones sin secretos continúan y que el análisis Sonar no intenta acceder a `SONAR_TOKEN`.

**Acceptance Scenarios**:

1. **Given** un push a `main` o `dev`, o una Pull Request dirigida a una de esas ramas y originada en una rama del mismo repositorio, **When** se ejecuta el CI, **Then** SonarQube Cloud analiza la calidad y seguridad del cambio.
2. **Given** que los tests generan un reporte de cobertura disponible para la ejecución, **When** SonarQube Cloud realiza el análisis, **Then** consume ese reporte y lo considera en sus resultados.
3. **Given** que el análisis termina y el Quality Gate aprueba, **When** todas las demás verificaciones obligatorias también aprueban, **Then** el cambio puede considerarse válido para integración.
4. **Given** que el Quality Gate falla, **When** finaliza el análisis, **Then** el CI falla y el cambio no se considera válido para integración.
5. **Given** una ejecución asociada a una Pull Request, **When** SonarQube Cloud publica el resultado, **Then** su estado queda visible en GitHub dentro del contexto de esa Pull Request y permite acceder al detalle del análisis.
6. **Given** una ejecución asociada a un push incluido, **When** SonarQube Cloud publica el resultado, **Then** su estado queda visible en GitHub y asociado a la revisión analizada.
7. **Given** una Pull Request dirigida a `main` o `dev` y originada en un fork, **When** se ejecuta el CI, **Then** las validaciones que no requieren secretos continúan ejecutándose cuando sea posible y Sonar no se ejecuta ni accede a `SONAR_TOKEN`.

### Edge Cases

- Una suite obligatoria no existe, no puede descubrirse o finaliza sin ejecutar los tests esperados: la ejecución no debe presentarse como aprobada silenciosamente.
- Docker está ausente, inaccesible o sin permisos suficientes para Testcontainers: los tests afectados y el CI deben fallar con una causa visible.
- PostgreSQL no puede iniciar o no queda disponible para un test de integración: la suite debe fallar sin sustituirlo por una implementación simulada.
- Un test o la aplicación deja contenedores o procesos activos: la ejecución debe finalizar limpiando los recursos temporales que haya creado.
- La imagen se construye pero el contenedor termina antes del health check: el CI debe fallar y conservar los logs del contenedor.
- `GET /health` responde con error, una respuesta no exitosa o no responde antes del timeout: la verificación debe fallar.
- La aplicación tarda en iniciar: la verificación puede reintentar durante el período permitido, pero nunca esperar indefinidamente.
- Fallan varias verificaciones: el resultado final debe ser fallido y debe conservar suficiente evidencia para identificar cada falla efectivamente ejecutada.
- Una actualización de una Pull Request cambia su rama de destino entre `main`, `dev` y otra rama: el activity type `edited` debe volver a evaluar el filtro y el CI debe ejecutarse únicamente cuando el destino vigente esté incluido en esta feature.
- Los tests no generan uno o ambos reportes de cobertura: el análisis debe ejecutarse sin inventar datos de cobertura y hacer visible cuáles no estaban disponibles; esa ausencia no constituye por sí sola un requisito independiente de falla.
- Los tests generan un reporte de cobertura, pero el análisis no puede consumirlo: la validación de calidad no debe considerarse completada satisfactoriamente.
- SonarQube Cloud no está disponible, el análisis no finaliza o no puede determinarse el Quality Gate: al ser una validación obligatoria, el cambio no debe considerarse válido para integración.
- El resultado del análisis existe, pero no queda asociado al push o a la Pull Request correspondiente en GitHub: la validación no debe considerarse completada satisfactoriamente.
- Una Pull Request proviene de un fork: Sonar queda fuera de alcance para esa revisión porque el workflow no recibe `SONAR_TOKEN`; no se debe usar `pull_request_target` ni otro workflow privilegiado, y las validaciones sin secretos deben continuar cuando sea posible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El CI MUST ejecutarse ante todo push a `main`.
- **FR-002**: El CI MUST ejecutarse ante todo push a `dev`.
- **FR-003**: El CI MUST ejecutarse para una Pull Request dirigida a `main` en los activity types `opened`, `reopened`, `synchronize` y `edited`, incluido un cambio de rama base que deje a `main` como destino vigente.
- **FR-004**: El CI MUST ejecutarse para una Pull Request dirigida a `dev` en los activity types `opened`, `reopened`, `synchronize` y `edited`, incluido un cambio de rama base que deje a `dev` como destino vigente.
- **FR-005**: Cada ejecución MUST comprobar que la aplicación compila correctamente.
- **FR-006**: Cada ejecución MUST ejecutar todos los tests unitarios existentes sin requerir infraestructura.
- **FR-007**: Cada ejecución MUST ejecutar todos los tests de integración existentes.
- **FR-008**: Los tests de integración que involucren persistencia MUST utilizar PostgreSQL real mediante Testcontainers y MUST NOT sustituirlo por mocks, bases en memoria u otra persistencia simplificada.
- **FR-009**: El entorno de CI MUST permitir que Testcontainers utilice Docker para crear, consultar y eliminar los contenedores requeridos por los tests.
- **FR-010**: Cada ejecución MUST construir correctamente una imagen Docker de la aplicación.
- **FR-011**: Cada ejecución MUST iniciar un contenedor utilizando exactamente la imagen construida en esa misma ejecución.
- **FR-012**: Cada ejecución MUST comprobar mediante HTTP `GET /health` que el servidor iniciado desde la imagen responde con estado `200`.
- **FR-013**: La espera por disponibilidad del servidor MUST tener un timeout finito, explícito y documentado; su vencimiento MUST hacer fallar el CI.
- **FR-014**: Si el contenedor termina prematuramente, no inicia o no responde antes del timeout, la ejecución MUST exponer sus logs como evidencia diagnóstica antes de finalizar.
- **FR-015**: El CI MUST finalizar con estado fallido si falla cualquiera de las verificaciones obligatorias de compilación, tests, disponibilidad de infraestructura, análisis de calidad y seguridad, Quality Gate, construcción de imagen, inicio del contenedor o salud HTTP.
- **FR-016**: Una ejecución MUST NOT aprobar si una suite obligatoria fue omitida, deshabilitada o no ejecutó los tests existentes esperados. El CI MUST validar recurrentemente que Jest descubre todos los archivos de suite correspondientes según las rutas, patrones y configuración versionados, sin utilizar un número fijo de tests como guard.
- **FR-017**: La incorporación del CI MUST NOT modificar, eliminar, deshabilitar ni saltear tests existentes sin aprobación explícita de la usuaria.
- **FR-018**: Los tests end-to-end MUST permanecer separados y fuera de esta ejecución hasta que su paquete pendiente sea definido explícitamente.
- **FR-019**: La ejecución MUST liberar los contenedores y procesos temporales que haya creado, aun cuando una verificación falle.
- **FR-020**: Esta feature MUST NOT desplegar la aplicación, publicar imágenes en registries ni configurar ambientes de producción o staging.
- **FR-021**: Cada ejecución cubierta por FR-001 a FR-002 y cada Pull Request cubierta por FR-003 a FR-004 que se origine en una rama del mismo repositorio MUST realizar un análisis de calidad y seguridad con SonarQube Cloud. En Pull Requests desde forks, Sonar queda fuera de alcance y las validaciones que no requieren secretos MUST continuar cuando sea posible, sin usar `pull_request_target` ni workflows privilegiados.
- **FR-022**: Cuando los tests generen uno o más reportes de cobertura disponibles, el análisis de SonarQube Cloud MUST consumirlos y reflejarlos en sus resultados. La ausencia de uno o ambos LCOV MUST NOT omitir el análisis ni constituir por sí sola un requisito independiente de éxito o falla del CI.
- **FR-023**: El Quality Gate de SonarQube Cloud MUST ser una validación obligatoria del CI.
- **FR-024**: Si el Quality Gate falla, el CI MUST finalizar con estado fallido y el cambio MUST NOT considerarse válido para integración.
- **FR-025**: Si el análisis obligatorio no finaliza o no permite determinar el resultado del Quality Gate, el CI MUST NOT considerar aprobada la validación.
- **FR-026**: Cuando el análisis Sonar sea obligatorio según FR-021, su resultado y el del Quality Gate MUST quedar visibles en GitHub y asociados a la revisión analizada.
- **FR-027**: En las Pull Requests dirigidas a `main` o `dev` y originadas en ramas del mismo repositorio, el resultado MUST quedar visible en el contexto de la Pull Request e indicar si el Quality Gate aprobó o falló, con acceso al detalle del análisis.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los pushes a `main` y `dev`, y de los eventos `opened`, `reopened`, `synchronize` y `edited` de Pull Requests cuyo destino vigente sea una de esas ramas, inicia las validaciones aplicables.
- **SC-002**: El 100 % de las ejecuciones aprobadas contiene evidencia de compilación exitosa y de ejecución satisfactoria de todas las suites unitarias y de integración existentes.
- **SC-003**: El 100 % de los tests de integración con persistencia se ejecuta contra una instancia real y aislada para la ejecución, sin reemplazos simulados.
- **SC-004**: El 100 % de las ejecuciones aprobadas construye el artefacto empaquetado, inicia una instancia desde ese mismo artefacto y obtiene una respuesta de salud exitosa.
- **SC-005**: Una falla introducida de manera controlada en cualquiera de las verificaciones obligatorias produce un resultado final fallido en el 100 % de los casos.
- **SC-006**: Toda verificación de startup termina en éxito o falla dentro del límite de espera documentado; ninguna ejecución queda esperando indefinidamente.
- **SC-007**: El 100 % de los fallos de startup deja disponible evidencia diagnóstica de la instancia correspondiente a esa ejecución.
- **SC-008**: Cero tests existentes son modificados, eliminados, deshabilitados u omitidos sin la aprobación explícita requerida.
- **SC-009**: Una persona revisora puede identificar, desde el resultado de la ejecución y sin reproducirla localmente, cuál categoría obligatoria falló.
- **SC-010**: El 100 % de los pushes incluidos y de las Pull Requests incluidas originadas en ramas del mismo repositorio obtiene un resultado de análisis de calidad y seguridad y un resultado de la condición de aceptación correspondiente.
- **SC-011**: El 100 % de los reportes de cobertura efectivamente generados y disponibles durante las ejecuciones incluidas es incorporado al análisis de calidad, sin omitir Sonar cuando falte uno o ambos.
- **SC-012**: El 100 % de los cambios que no superan la condición obligatoria de calidad termina con una validación fallida y no se presenta como válido para integración.
- **SC-013**: El 100 % de los análisis asociados a Pull Requests incluidas y originadas en ramas del mismo repositorio muestra en la propia propuesta el resultado de la condición de aceptación y permite consultar su detalle.

## Assumptions

- `GET /health` ya representa el contrato público de salud de la aplicación y su estado HTTP `200` indica que el servidor levantó correctamente.
- El timeout de startup se definirá durante la planificación con un valor finito, explícito y suficientemente amplio para variaciones normales del entorno; la especificación exige el comportamiento observable, no un valor ni una estrategia de reintentos concretos.
- Las suites unitarias y de integración existentes pueden identificarse y ejecutarse de forma diferenciada mediante las convenciones vigentes del proyecto.
- La infraestructura temporal necesaria para los tests y para verificar la imagen se crea únicamente durante la ejecución y no requiere servicios persistentes preexistentes.
- La imagen construida es un artefacto de validación de la ejecución; no se conserva ni publica como parte de esta feature.
- GitHub Actions es el servicio de Continuous Integration solicitado, pero la organización interna del workflow, las acciones reutilizadas, las versiones y el orden de pasos se decidirán en la planificación.
- SonarQube Cloud dispone del proyecto y de las reglas que determinan su Quality Gate; la definición o modificación de esas reglas no forma parte de esta especificación.
- La obligación de consumir cobertura aplica cuando las suites generan un reporte disponible; esta feature no presupone datos de cobertura inexistentes.
- El mecanismo de autenticación con SonarQube Cloud, los valores protegidos, el formato de configuración y su ubicación se definirán durante la planificación.
- GitHub no entrega `SONAR_TOKEN` a workflows `pull_request` provenientes de forks. Esta feature no usa `pull_request_target` ni un workflow privilegiado; por lo tanto, Sonar no es una validación aplicable a esas Pull Requests, aunque los checks sin secretos continúan cuando sea posible.
- El deployment, la publicación en cualquier registry, GitHub Container Registry, los ambientes de producción o staging y la definición del paquete end-to-end quedan fuera de alcance.
