# Data Model: Catálogo de jugadores

## Liga

Representa una de las cinco competencias admitidas por el catálogo.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | UUID | Obligatorio, generado por el sistema y estable |
| `codigo` | Texto | Obligatorio, normalizado, único; identifica la liga en filtros |
| `nombre` | Texto | Obligatorio y único dentro del catálogo |

Los códigos iniciales son:

```text
premier-league
bundesliga
la-liga
serie-a
ligue-1
```

## Equipo

Representa el club actual de uno o más jugadores.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | UUID | Obligatorio, generado por el sistema y estable |
| `nombre` | Texto | Obligatorio y normalizado |
| `ligaId` | UUID | Obligatorio; referencia a `Liga` |

### Invariantes de equipo

- La combinación `ligaId` + `nombre` es única.
- Un equipo pertenece a una única liga dentro de este alcance.
- Los cambios de liga y el historial de transferencias quedan fuera de la feature.

## Jugador

Representa al jugador visible en el catálogo.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | UUID | Obligatorio, generado por el sistema y estable |
| `nombre` | Texto | Obligatorio, recortado y no vacío |
| `posicion` | Texto | Obligatorio, normalizado y no vacío |
| `equipoId` | UUID | Obligatorio; referencia al equipo actual |
| `ligaId` | UUID | Obligatorio; referencia a la liga actual |
| `activo` | Booleano | Obligatorio; solo los activos son visibles públicamente |
| `actualizadoEn` | Fecha/hora | Obligatoria; se almacena en UTC |

### Invariantes de jugador

- El jugador siempre tiene nombre, posición, equipo y liga.
- El equipo relacionado debe pertenecer a la liga relacionada.
- Un jugador inactivo no aparece en `GET /players` ni en su detalle público.
- Una actualización conserva el `id` interno del jugador.

## Identidad externa del jugador

Permite relacionar un jugador interno con una fuente externa sin hacer que el dominio
dependa de esa fuente.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | UUID | Obligatorio, generado por el sistema y estable |
| `jugadorId` | UUID | Obligatorio; referencia a `Jugador` |
| `proveedor` | Texto | Obligatorio, recortado y no vacío |
| `externalId` | Texto | Obligatorio, recortado y no vacío |

### Invariantes de identidad externa

- `proveedor` + `externalId` es único globalmente.
- Un jugador puede tener identidades de más de un proveedor.
- La misma identidad externa no puede pertenecer a dos jugadores.
- La identidad externa no se expone en las respuestas públicas del catálogo.
- Para la futura importación, la combinación funciona como clave de idempotencia.

## Relaciones

```text
Liga 1 ──────── N Equipo
Liga 1 ──────── N Jugador
Equipo 1 ────── N Jugador
Jugador 1 ───── N IdentidadExternaJugador
```

La relación `Jugador.equipoId` + `Jugador.ligaId` debe ser consistente. La
implementación puede reforzarla mediante una clave foránea compuesta en PostgreSQL,
además de validarla en el modelo de dominio.

## Persistencia lógica

Tablas previstas:

```text
ligas
  id uuid primary key
  codigo varchar(100) unique not null
  nombre varchar(100) unique not null

equipos
  id uuid primary key
  liga_id uuid not null references ligas(id)
  nombre varchar(150) not null
  unique (liga_id, nombre)

jugadores
  id uuid primary key
  liga_id uuid not null references ligas(id)
  equipo_id uuid not null references equipos(id)
  nombre varchar(200) not null
  posicion varchar(100) not null
  activo boolean not null
  actualizado_en timestamptz not null

identidades_externas_jugador
  id uuid primary key
  jugador_id uuid not null references jugadores(id)
  proveedor varchar(100) not null
  external_id varchar(200) not null
  unique (proveedor, external_id)
```

Se requieren índices para `jugadores.activo`, `jugadores.liga_id`,
`jugadores.equipo_id` y `jugadores.posicion`. Los nombres de tablas y columnas son
de persistencia; el modelo de dominio usa identificadores en español sin acentos.
