# Research: acceso técnico a WhoScored

## Alcance de la investigación

Esta investigación resuelve únicamente cómo localizar un jugador en WhoScored y cómo extraer las siete estadísticas requeridas. No define una librería concreta de browser automation, no modifica el catálogo y no agrega endpoints.

La inspección se realizó sobre el sitio oficial de WhoScored el 23/09/2026, usando una búsqueda pública y un perfil público de referencia:

- [Búsqueda pública de Raphinha](https://www.whoscored.com/search/?t=Raphinha)
- [Perfil oficial de Raphinha](https://www.whoscored.com/players/300447/show/raphinha)

## Validación técnica previa a `WhoScoredAdapter`

El contrato de ejecución del proyecto declara Node `22.11.x` en `backend/package.json`. Antes de implementar el adapter se debe ejecutar una validación desde el entorno real del backend (o desde el runtime/container que ejecutará la aplicación) que compruebe:

1. `typeof fetch === 'function'`;
2. `typeof AbortController === 'function'`;
3. una request GET al recurso de búsqueda de WhoScored;
4. abortar una request que supere el timeout individual;
5. convertir un error de red en un resultado controlado y no en una excepción sin clasificar.

La comprobación exploratoria disponible en este checkout ejecutó Node `v24.6.0`: `fetch` y `AbortController` estuvieron disponibles, pero la request a WhoScored terminó con `TypeError: fetch failed` y causa `ENOTFOUND www.whoscored.com`, por falta de resolución DNS del entorno. Esto valida la disponibilidad de las APIs nativas, pero no acredita conectividad live desde el runtime objetivo. La validación obligatoria previa al adapter debe repetirse bajo Node `22.11.x` y con la conectividad real del backend.

La decisión de transporte sigue siendo `fetch` nativo, sin dependencia nueva. Si el runtime objetivo no expone `fetch`, la alternativa mínima compatible es un transporte basado en `https.request` nativo de Node detrás de la misma interfaz sustituible. No se incorpora browser automation ni una librería adicional. En ambos casos, una falla real de transporte se informa como `fuente_no_disponible`.

## Decisión 1: mecanismo concreto de acceso

**Decision**: `WhoScoredAdapter` usará el `fetch` nativo de Node 22, encapsulado en un transporte sustituible dentro de `backend/src/players/adapters/whoscored/`, luego de completar la validación técnica previa. La secuencia observada es:

1. `GET https://www.whoscored.com/search/?t={encodeURIComponent(nombreJugador)}`.
2. Parsear la respuesta de búsqueda para obtener filas de jugadores, nombre mostrado, enlace de perfil y, cuando aparece, enlace de equipo.
3. Para los candidatos compatibles con nombre/equipo, hacer `GET https://www.whoscored.com/players/{playerId}/show/{slug}`.
4. Leer del perfil el payload estructurado embebido en `require.config.params['args'].tournaments`.

La búsqueda devuelve HTML con una tabla de resultados. El perfil también es una respuesta HTML, pero contiene datos estructurados en una configuración JavaScript; esa configuración es la fuente primaria del adapter. No se parsearán las tablas visuales de estadísticas ni se fijarán selectores de presentación.

No se usarán endpoints históricos de `StatisticsFeed` sin una nueva comprobación de la versión actual del sitio. En la observación actual no fue necesario consultar un XHR/fetch separado para las siete métricas: el perfil ya contiene los objetos de competición con los campos requeridos. Si una futura respuesta no incluye el payload estructurado, el adapter devolverá `estructura_inesperada` en vez de recurrir silenciosamente a HTML visual.

## Decisión 2: datos estructurados observados

En el perfil se observó un objeto con forma equivalente a:

```js
require.config.params['args'] = {
  tournaments: [{
    TournamentName: 'LaLiga',
    TeamName: 'Barcelona',
    PlayerId: 300447,
    Goals: 12,
    Assists: 3,
    TotalShots: 25,
    KeyPasses: 14,
    Dribbles: 12,
    TotalTackles: 4,
    Rating: 8.948571428571428
  }],
  playerId: 300447,
  currentTeamId: 65
};
```

El fixture no debe copiar información innecesaria del perfil real. Se guardará una versión sanitizada del bloque estructurado y el HTML mínimo que lo contiene, junto con el resultado esperado. El HTML permite probar la extracción; el JSON esperado permite probar el mapping sin red.

## Decisión 3: mapping de las estadísticas

| Campo WhoScored | Campo interno | Semántica |
|---|---|---|
| `Goals` | `goles` | goles del jugador en el registro de competición/equipo seleccionado |
| `Assists` | `asistencias` | asistencias del jugador |
| `TotalShots` | `tiros` | cantidad total de tiros; `SpG` no se utiliza porque es promedio por partido |
| `KeyPasses` | `pasesClave` | pases que generan una ocasión según el registro de WhoScored |
| `Dribbles` | `regates` | regates registrados |
| `TotalTackles` | `entradas` | cantidad total de entradas |
| `Rating` | `ratingWhoScored` | valoración numérica de WhoScored |

Los contadores deben ser enteros no negativos. `Rating` debe ser finito y no negativo. Un valor numérico `0` es válido. Un campo ausente, `null`, vacío o no interpretable se transforma en `null` y conserva la diferencia entre dato no disponible y cero.

## Decisión 4: matching determinístico por liga, equipo, temporada y jugador

El payload observado representa cada contexto estadístico en un registro de `tournaments` con campos como `TournamentName`, `TournamentId`, `RegionName`, `SeasonId`, `StageId`, `TeamName`, `TeamId` y `PlayerId`. El perfil también expone `playerId` y `currentTeamId` como contexto superior. La selección se realiza en este orden:

1. **Liga/torneo**: conservar registros cuyo `TournamentName` coincida con `ligaEquipoJugador` después de normalizar espacios, mayúsculas/minúsculas y diacríticos. `RegionName` se conserva como contexto; no reemplaza al torneo salvo que exista un alias explícito definido por el catálogo.
2. **Equipo**: conservar registros cuyo `TeamName` coincida con `equipoJugador` y, cuando estén disponibles, cuyo `TeamId` sea consistente con el equipo del candidato y `currentTeamId`.
3. **Temporada actual/vigente**: conservar el registro cuyo `SeasonId` corresponda a la temporada actual indicada por el contexto de la página. Si la respuesta no trae una marca explícita de temporada actual, se utilizará únicamente el mayor `SeasonId` numérico entre los registros ya filtrados por torneo y equipo, y solo si ese máximo es único. No se combinan temporadas.
4. **Jugador**: conservar el candidato cuyo `PlayerId` coincida con el enlace de perfil y cuyo nombre normalizado coincida con `nombreJugador`.

Después de aplicar los cuatro criterios:

- exactamente un registro válido: se puede utilizar;
- varios registros igualmente válidos: `matching_ambiguo` y no se persiste;
- ningún registro válido: `jugador_no_encontrado` si no queda candidato externo, o ausencia de registro compatible si el perfil existe pero no tiene el torneo/equipo/temporada solicitados.

No se infieren ni combinan estadísticas provenientes de distintas temporadas, equipos o competiciones. Los valores originales se conservan solo como contexto de diagnóstico.

No se acepta un resultado por nombre solo, no se elige el primer candidato arbitrariamente y no se aplican reglas difusas no documentadas. Si la liga, el equipo o la temporada no pueden confirmarse de forma única, no se guarda nada.

## Decisión 5: timeout individual y deadline total

- timeout por request: `10_000 ms`, controlado con `AbortController`;
- deadline total de la operación: `30_000 ms`, controlado por el servicio/caso de uso;
- reintentos automáticos: ninguno;
- requests posteriores al deadline: cancelados o ignorados si el transporte no permite abortar.

El servicio crea el deadline al comenzar la operación y no invoca al writer después de superarlo. El adapter recibe el contexto de cancelación de la operación; cada request usa el menor valor entre los `10_000 ms` individuales y el tiempo restante del deadline. Timeout individual, error de red, respuesta bloqueada, HTTP no exitoso no recuperable o agotamiento del deadline se normalizan como `fuente_no_disponible`. Si no es posible abortar una request ya iniciada, su respuesta tardía se descarta y no puede producir persistencia.

Una respuesta HTTP válida pero sin el bloque estructurado esperado, sin `playerId` interpretable o con tipos incompatibles se clasifica como `estructura_inesperada`. Una estructura válida con campos estadísticos omitidos se clasifica como `exito_parcial` si queda al menos una métrica válida, o `sin_estadisticas` si no queda ninguna.

## Decisión 6: estadísticas parciales y atomicidad de persistencia

Una **estadística parcial persistible** es una observación válida: el jugador fue identificado de forma única, al menos una de las siete métricas está disponible y los campos faltantes se representan como `null`. Se persiste una única observación transaccional y el resultado es `exito_parcial`.

La **escritura parcial prohibida** es distinta: una falla a mitad de la escritura, una fila incompleta, una relación huérfana o solo una parte de la observación almacenada. El writer real debe insertar la observación de forma atómica; ante un error devuelve `error_persistencia` y no deja ningún registro parcial. No se utilizará la expresión “persistencia parcial” para describir métricas faltantes.

## Decisión 7: formato de fixtures

Los fixtures vivirán dentro del módulo de tests:

```text
backend/test/unit/players/fixtures/whoscored/
├── search-raphinha.html
├── profile-raphinha.html
├── profile-raphinha.expected.json
├── profile-missing-stats.html
├── profile-zero-values.html
├── search-ambiguous-name.html
└── profile-unexpected-structure.html
```

Reglas del formato:

- `search-*.html` contiene solo la tabla de candidatos relevante, con URLs relativas o absolutas reales del sitio.
- `profile-*.html` contiene el bloque `require.config.params['args']` sanitizado, sin cookies, identificadores de sesión ni contenido publicitario irrelevante.
- `*.expected.json` expresa el candidato seleccionado, el equipo/liga y las siete métricas normalizadas, incluyendo `null` y `0` explícitamente.
- Los casos de timeout, HTTP no disponible y error de persistencia no requieren HTML: se modelan con fakes del transporte y del writer.

Estos archivos son contratos de test, no datos live. CI no dependerá de WhoScored ni de Football-Data.

## Decisión 8: integración con el catálogo

La rama actual no contiene todavía `backend/src/players` ni una migración de jugadores; la única migración inspeccionada es `backend/migrations/1710000000000-CreateUsuarios.ts`. Por eso:

- el lookup de `idJugador` se define como puerto mínimo sustituible y se prueba con fake;
- el writer se prueba con fake en la rama actual;
- no se crea `Jugador`, `JugadorEntity`, `players.repository.ts` ni una migración temporal;
- la foreign key y el provider real se agregan luego del merge del catálogo, usando el tipo de clave y el siguiente timestamp real de esa rama.

## Alternativas descartadas

- Parsear directamente el HTML visual: descartado porque es más frágil y el perfil ya expone un payload estructurado.
- Depender de un endpoint histórico no verificado: descartado porque podría cambiar o no estar disponible.
- Hacer la consulta desde el servicio: descartado porque rompe la separación con el proveedor externo.
- Tests live en CI: descartado por no determinismo, timeout y cambios del sitio.
- Crear una tabla o entidad local de jugadores: descartado porque duplicaría el catálogo en desarrollo paralelo.
