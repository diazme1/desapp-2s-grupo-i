# Modelo de datos

## Datos existentes

NestJS reutiliza `jugadores`, `estadisticas_jugadores`, `cotizacion_vigente`, `versiones_estrategia_cotizacion` y `recalculo_cotizacion_activo`. `historial_cotizacion` no recibe escrituras de esta feature.

## Artefactos Python

Cada entrenamiento genera:

- `model.json`: intercepto y coeficientes de la regresión lineal regularizada;
- `manifest.json`: versión de modelo, dataset, cobertura temporal, origen, esquema, escalas, transformaciones, parámetros de estandarización, rangos de entrada y métricas;
- `active-model.json`: puntero atómico al último modelo entrenado.

Los snapshots contienen jugador externo, temporada, fecha/período, granularidad, posición general, estadísticas y origen. La posición se normaliza a `goalkeeper`, `defender`, `midfielder`, `forward` o `unknown`; `unknown` es la referencia y las otras categorías se codifican one-hot en el único modelo global. Las estadísticas de entrada se estandarizan con media y escala calculadas solo sobre entrenamiento. Los ejemplos usan `t`, `t + 15` y el snapshot posterior más cercano dentro de 3 días.

Los bodies reproducibles están en `ml-players/examples/`: `training-body-whoscored-2026.json` usa una muestra real de WhoScored y `training-body-30-players-positions-synthetic.json` contiene 30 jugadores, cuatro posiciones y 120 snapshots para validar volumen y codificación. Este último no es evidencia de precisión deportiva.

## Respuesta de entrenamiento

```text
estado: entrenado
versionModelo
versionDataset
versionTransformaciones
origenDatos
cantidadSnapshots
cantidadEjemplos
metricas: validacion, prueba, baselinePrueba
```

## Respuesta online

NestJS devuelve `cotizacionActual`, `cotizacionPredicha`, metadatos del modelo y estadísticas predichas. La respuesta es efímera y no modifica el mercado.
