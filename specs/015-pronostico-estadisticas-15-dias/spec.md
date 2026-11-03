# Feature Specification: Pronóstico de estadísticas y cotización a 15 días

**Feature Branch**: `015-pronostico-estadisticas-15-dias`  
**Status**: Draft

## Objetivo

Permitir consultar la cotización actual de un jugador y una cotización posible a 15 días. Python/FastAPI predice las siete estadísticas; NestJS aplica `EstrategiaCotizacion` y calcula la cotización posible.

El superadmin puede iniciar un entrenamiento sincrónico. Al finalizar, el modelo queda disponible, versionado y el endpoint devuelve sus métricas. No existe flujo de aprobación, rechazo ni espera de validación.

## Historias y aceptación

### US1 — Consultar cotización actual y posible

Como usuario autenticado, quiero ver ambas cotizaciones separadas.

- `GET /players/{id}/prediction` devuelve `cotizacionActual`, `cotizacionPredicha` o `null`, estadísticas predichas y metadatos.
- El endpoint utiliza la estrategia activa registrada y no recibe una estrategia por query param.
- NestJS calcula la cotización predicha con la estrategia activa registrada.
- La cotización actual no se modifica ni se escribe en el historial oficial.

### US2 — Entrenar el modelo

Como superadmin, quiero iniciar el entrenamiento y conocer su resultado.

- `POST /ml-players/train` delega el entrenamiento a FastAPI y espera su finalización.
- Si termina correctamente, responde HTTP 200, deja el modelo activo y devuelve versión de modelo, dataset, transformaciones, origen, cantidad de ejemplos y métricas.
- La nueva versión reemplaza el puntero activo de forma atómica; no requiere aprobación posterior.
- Si el dataset no permite entrenar, responde 422; un fallo técnico de FastAPI responde 503.

### US3 — Predicción no disponible

- Sin modelo, estadísticas o estrategia, la consulta devuelve HTTP 200 con `cotizacionPredicha: null`.
- Si FastAPI está caído, expira el timeout o falla la red, devuelve HTTP 503.

## Requisitos funcionales

- **FR-001**: El entrenamiento y la inferencia se ejecutan en Python/FastAPI, fuera del proceso principal de NestJS.
- **FR-002**: NestJS consume FastAPI mediante un adapter interno autenticado con `X-ML-Internal-Token`; el frontend solo consume NestJS.
- **FR-002a**: La inferencia interna recibe estadísticas actuales y posición, sin requerir un identificador de jugador. Los identificadores se utilizan en los snapshots de entrenamiento para agrupar la evolución temporal.
- **FR-003**: El entrenamiento usa regresión lineal y un modelo global, no un modelo individual por jugador.
- **FR-003a**: El modelo puede utilizar la posición general del jugador como variable categórica codificada (`goalkeeper`, `defender`, `midfielder`, `forward`, `unknown`), sin crear un modelo separado por posición.
- **FR-003b**: El modelo utiliza regresión lineal regularizada, estandariza las variables numéricas con datos de entrenamiento y limita las entradas a los rangos observados para evitar extrapolaciones extremas.
- **FR-004**: FastAPI predice únicamente goles, asistencias, tiros, pases clave, regates, faltas cometidas y rating. No recibe pesos ni calcula cotizaciones.
- **FR-005**: Los valores negativos se ajustan a cero; goles y asistencias se redondean half-up y las estadísticas continuas conservan tres decimales.
- **FR-006**: `fechaObjetivo` es `fechaGeneracion + 15 días calendario`. Cada ejemplo usa el snapshot posterior a `t` más cercano al objetivo, con tolerancia máxima de 3 días; sin snapshot válido se excluye.
- **FR-007**: Los datos identifican jugador, temporada, fecha/período, estadísticas, granularidad y origen. Totales finales de temporada no alcanzan para entrenar.
- **FR-008**: WhoScored es el origen inicial principal. `app` y `synthetic` se registran por separado; los datos sintéticos solo validan técnicamente el flujo.
- **FR-009**: Cada entrenamiento genera una versión de modelo y conserva versión de dataset, cobertura temporal, origen, esquema, transformaciones y métricas.
- **FR-010**: El endpoint de entrenamiento deja disponible el modelo generado y devuelve al menos MAE y RMSE por estadística para validación y prueba, junto con el baseline de prueba.
- **FR-011**: NestJS aplica exclusivamente `EstrategiaCotizacion` para calcular `cotizacionPredicha`, con dos decimales exactos.
- **FR-012**: La cotización predicha es informativa: no modifica `cotizacion_vigente`, `historial_cotizacion` ni operaciones de compra/venta.
- **FR-013**: FastAPI puede iniciar en `no_model_loaded`; en ese estado no devuelve estadísticas. Luego de una carga, una recarga fallida conserva el modelo anterior.

## Criterios de éxito

- **SC-001**: Un entrenamiento exitoso responde HTTP 200 con una versión, un dataset versionado, cantidad de ejemplos y métricas.
- **SC-002**: Una consulta distingue la cotización actual de la predicha; esta última es un decimal de dos posiciones o `null`.
- **SC-003**: La cotización predicha siempre pasa por `EstrategiaCotizacion`; Python nunca calcula dinero.
- **SC-004**: Los ejemplos respetan `t`, `t + 15`, posterioridad y tolerancia de 3 días sin filtración futura.
- **SC-005**: Los tests cubren entrenamiento, métricas, versionado, seguridad, ausencia de modelo y recarga.

## Fuera de alcance

Aprobación, rechazo, estados de validación, modelos de cotización, persistencia de predicciones online, nuevas tablas ML, deep learning, automatización de compras/ventas y modificación automática de la estrategia.
