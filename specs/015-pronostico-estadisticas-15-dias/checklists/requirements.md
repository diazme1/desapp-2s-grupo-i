# Checklist de calidad

- [x] La especificación distingue Python/FastAPI de NestJS.
- [x] Python predice únicamente estadísticas.
- [x] NestJS calcula la cotización mediante `EstrategiaCotizacion`.
- [x] La cotización actual y la predicha están separadas.
- [x] La cotización predicha puede ser `null` sin afectar la actual.
- [x] Los estados 200 no disponible y 503 técnico están definidos.
- [x] La temporalidad de 15 días y tolerancia de 3 días están definidas.
- [x] No se agregan entidades ni migraciones ML al backend.
- [x] No se modifica el historial oficial ni se automatizan operaciones.
- [x] El frontend consume únicamente NestJS.
- [x] Las rutas de código, tests y documentación son concretas.
- [x] El entrenamiento sincrónico devuelve versión y métricas y deja el modelo activo.
- [x] No existen estados ni endpoints de aprobación, rechazo o validación pendiente.
- [x] La implementación conserva el estado de la feature como Draft.

## Notas

Se verificó el flujo único de entrenamiento: NestJS delega a FastAPI, espera HTTP 200 y recibe versión y métricas. Se eliminaron worker, persistencia ML y estados de aprobación/rechazo del alcance.
