# Data Model: estadísticas de jugadores desde WhoScored

## Jugador

`Jugador` es una entidad existente del catálogo. Esta feature no la crea, no la modifica estructuralmente y no duplica sus datos.

| Campo | Regla |
|---|---|
| `idJugador` | Identificador interno estable usado para asociar estadísticas. |
| nombre, equipo, liga | Contexto existente del jugador; no se persiste nuevamente en estadísticas. |

Mientras el catálogo no esté integrado, el caso de uso consume un puerto mínimo de lookup sustituible por fake. El tipo concreto y la implementación real se tomarán de `players.repository.ts` y `JugadorEntity` cuando existan.

## EstadisticasJugador — dominio

Representa una observación de estadísticas obtenida desde WhoScored.

| Campo | Tipo lógico | Regla |
|---|---|---|
| `idEstadistica` | identificador | propio de la observación; generado por persistencia o por el constructor según la convención existente |
| `idJugador` | identificador | obligatorio; nunca se acepta vacío |
| `goles` | entero o `null` | entero no negativo; `0` es válido |
| `asistencias` | entero o `null` | entero no negativo; `0` es válido |
| `tiros` | entero o `null` | total de tiros, no promedio por partido |
| `pasesClave` | entero o `null` | pases clave informados por WhoScored |
| `regates` | entero o `null` | regates informados por WhoScored |
| `entradas` | entero o `null` | entradas totales informadas por WhoScored |
| `ratingWhoScored` | número finito o `null` | rating externo; `0` se conserva si WhoScored lo entrega |

Invariantes:

- todos los contadores son enteros no negativos o `null`;
- el rating es finito, no negativo o `null`;
- `idJugador` es obligatorio;
- una observación con las siete métricas en `null` no es persistible;
- `0` y `null` son estados distintos y no se convierten entre sí;
- el dominio no conoce NestJS, HTTP, TypeORM, PostgreSQL ni HTML de WhoScored.

## Respuesta normalizada del adapter

El adapter no expone HTML ni los nombres de los campos externos fuera de su límite. Su salida normalizada contiene:

```text
identidad:
  playerIdExterno
  nombre
  equipo
  liga
metricas:
  goles: number | null
  asistencias: number | null
  tiros: number | null
  pasesClave: number | null
  regates: number | null
  entradas: number | null
  ratingWhoScored: number | null
estado: exito_completo | exito_parcial | jugador_no_encontrado |
        matching_ambiguo | fuente_no_disponible | estructura_inesperada |
        sin_estadisticas
```

La identidad normalizada solo se emite como exitosa cuando nombre, equipo y liga producen un único candidato consistente. Un campo estadístico faltante se representa como `null` y no invalida automáticamente las demás métricas.

## Resultado del caso de uso

El servicio interno devuelve un resultado tipado con un código en:

```text
exito_completo
exito_parcial
jugador_local_inexistente
jugador_no_encontrado
matching_ambiguo
fuente_no_disponible
estructura_inesperada
sin_estadisticas
error_persistencia
```

Los éxitos incluyen `idJugador`, las métricas normalizadas y, si corresponde, `idEstadistica`. Los estados sin escritura incluyen un detalle seguro para diagnóstico. `error_persistencia` no afirma éxito aunque el lookup y WhoScored hayan sido correctos.

## Puertos mínimos durante el desarrollo paralelo

No se crea una carpeta de repositorios ni un segundo repositorio de jugadores. El servicio requiere conceptualmente:

```text
JugadorLookupPort
  existePorId(idJugador) -> boolean o resumen mínimo de Jugador

EstadisticasJugadorWriterPort
  guardar(estadisticasJugador) -> idEstadistica
```

En la rama actual se implementan fakes de estos puertos para tests. Luego se conectan al contrato real de `players.repository.ts` y su implementación TypeORM.

## EstadisticasJugador — persistencia posterior al catálogo

Cuando exista `JugadorEntity`, la tabla deberá poder representar como mínimo:

| Columna | Restricción |
|---|---|
| `idEstadistica` | primary key |
| `idJugador` | not null, foreign key a la primary key real de `Jugador` |
| `goles`, `asistencias`, `tiros`, `pasesClave`, `regates`, `entradas` | nullable, enteros no negativos |
| `ratingWhoScored` | nullable, número finito no negativo |

La relación es `Jugador 1 ---- N EstadisticasJugador`. No hay unique sobre `idJugador`, porque una obtención posterior agrega otra observación. No se agrega cascade de borrado desde esta feature; la política seguirá la del catálogo real.

La migración se definirá únicamente después de inspeccionar la migración real que cree jugadores. No se crea una tabla `Jugador` temporal ni se usa un nombre de migración ficticio. La migración actualmente visible (`1710000000000-CreateUsuarios.ts`) no permite deducir todavía el timestamp de integración.

## Transiciones de datos faltantes

```text
valor externo numérico 0 -> dominio 0 -> columna 0
valor externo positivo  -> dominio número -> columna número
campo ausente/invalidado -> dominio null -> columna NULL
ninguna métrica válida  -> sin_estadisticas -> no insertar
```

Una falla de WhoScored no altera el agregado `Jugador` ni elimina observaciones existentes.
