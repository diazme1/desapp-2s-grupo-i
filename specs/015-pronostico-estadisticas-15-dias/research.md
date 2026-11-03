# Research

## Decisiones

- **Frontera**: Python/FastAPI predice las siete estadísticas; NestJS aplica `EstrategiaCotizacion`.
- **Entrenamiento**: un único endpoint sincrónico inicia el entrenamiento, calcula métricas, versiona el artefacto y lo deja activo.
- **Integración**: NestJS usa un adapter con `X-ML-Internal-Token`; el frontend no conoce FastAPI.
- **Persistencia**: solo se guardan artefactos, manifests y el puntero activo en `ml-players`. No se agregan tablas ML al backend.
- **Recarga**: FastAPI carga el nuevo artefacto en segundo plano y hace swap atómico; si falla, conserva el anterior.

## No adoptado

No se implementan worker, corridas persistidas, aprobación, rechazo, estados de validación, endpoints de métricas separados ni modelos de cotización.
