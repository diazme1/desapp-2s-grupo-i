# Data Model: Catálogo base de jugadores

## Liga

Representa una de las competencias de producto importadas desde Football-Data.org.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | UUID | Obligatorio, generado por la aplicación y estable. |
| `proveedorId` | Entero | Obligatorio, positivo y único por proveedor. |
| `codigo` | Texto | Obligatorio, normalizado a mayúsculas y único. |
| `nombre` | Texto | Obligatorio, no vacío. |
| `pais` | Texto nullable | Opcional; se conserva si la fuente lo entrega. |
| `emblemaUrl` | URL nullable | Opcional. |

## Equipo

Representa un club perteneciente a una liga vigente.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | UUID | Obligatorio, generado por la aplicación y estable. |
| `proveedorId` | Entero | Obligatorio, positivo y único por proveedor. |
| `ligaId` | UUID | Obligatorio; referencia una `Liga`. |
| `nombre` | Texto | Obligatorio, no vacío. |
| `nombreCorto` | Texto nullable | Opcional. |
| `sigla` | Texto nullable | Opcional, normalizada a mayúsculas. |
| `escudoUrl` | URL nullable | Opcional. |

## Jugador

Representa la información base de una persona incluida en la plantilla de un equipo.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | UUID | Obligatorio, generado por la aplicación y estable; es el ID público. |
| `proveedorId` | Entero | Obligatorio, positivo y único por proveedor. |
| `equipoId` | UUID | Obligatorio; referencia un `Equipo`. |
| `nombre` | Texto | Obligatorio, no vacío. |
| `nombreCompleto` | Texto nullable | Opcional. |
| `posicion` | Texto nullable | Opcional; no se interpreta como estadística. |
| `fechaNacimiento` | Fecha nullable | Opcional, formato ISO `YYYY-MM-DD`. |
| `nacionalidad` | Texto nullable | Opcional. |

## Relaciones

```text
Liga 1 ─── N Equipo 1 ─── N Jugador
```

La relación se persiste con foreign keys `equipos.liga_id` y `jugadores.equipo_id`.
La primera spec modela una pertenencia vigente por jugador; si una futura spec necesita
historial o múltiples equipos por temporada deberá ampliar el modelo explícitamente.

## CatálogoBase

Es el agregado de importación compuesto por `ligas`, `equipos` y `jugadores`. Las
referencias internas de los objetos del agregado se remapean a los IDs persistidos durante
el upsert. La operación completa se confirma o revierte como una única transacción.

## Invariantes

- Una liga, equipo o jugador nuevo siempre tiene UUID propio.
- No existen dos registros con el mismo `proveedorId` dentro de una entidad.
- Un equipo no puede persistirse sin liga y un jugador no puede persistirse sin equipo.
- Un refresh repetido conserva el UUID interno del registro existente.
- La falla de la fuente o de persistencia no elimina el último catálogo consistente.
- No se almacenan estadísticas, valuaciones, tokens ni datos de portfolio en este modelo.

## Actualización

```text
Sin registro externo -> Crear entidad local con UUID
Registro externo existente -> Actualizar atributos y relaciones, conservar UUID
Fuente inválida o transacción fallida -> Revertir todo el refresh
```
