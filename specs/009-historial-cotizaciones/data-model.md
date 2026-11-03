# Datos

- **HistorialCotizacion**: `id`, `id_jugador`, `fecha_hora`, `cotizacion`, `tipo_estrategia`, `id_version_estrategia`, `id_recalculo`, `id_estadistica`. Cotización decimal no negativa; FK restrictivas a jugador y estadísticas; índice por jugador/fecha/ID descendente.
- **Usuario**: correo normalizado, hash y rol `usuario|superadmin`; el rol predeterminado es `usuario`.
- El endpoint no modifica filas. Versión de estrategia y recálculo son referencias opacas en esta feature.
