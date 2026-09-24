# Quickstart: estadísticas de jugadores desde WhoScored

## Estado de la rama actual

La rama actual puede no contener todavía `backend/src/players` ni la tabla de jugadores. El trabajo ejecutable aquí no requiere crear esos componentes: usa el dominio, el adapter, el servicio interno y fakes de lookup/writer.

No se agrega endpoint HTTP. La operación se invoca conceptualmente como:

```ts
await estadisticasJugadorService.obtenerEstadisticasJugador(
  idJugador,
  nombreJugador,
  equipoJugador,
  ligaEquipoJugador,
);
```

## Preparar y verificar

Desde `backend`:

```bash
npm install
npm run build
npm run lint
npm run test:unit
```

Los tests unitarios deben ejecutarse sin internet, sin Football-Data, sin `POST /catalog/refresh` y sin un catálogo previamente poblado.

## Fixtures del adapter

Los fixtures estarán en:

```text
backend/test/unit/players/fixtures/whoscored/
```

El parser recibe un HTML sanitizado con el bloque estructurado del perfil. Los tests cubren:

- búsqueda con un candidato único;
- búsqueda con candidatos ambiguos;
- perfil con las siete métricas;
- valores `0`;
- campos ausentes;
- estructura inesperada.

Los casos de timeout y fuente no disponible usan un fake del transporte con timeout de 10 segundos configurado y no realizan requests live.

## Verificación del caso de uso

El fake de `JugadorLookupPort` debe poder responder tanto `existe` como `no existe`. El fake de `EstadisticasJugadorWriterPort` debe registrar la entidad recibida para comprobar que:

1. se verifica `idJugador` antes de consultar WhoScored;
2. se pasan nombre, equipo y liga al adapter;
3. se persiste solo una identidad externa única y consistente;
4. `0` se conserva y la ausencia se representa como `null`;
5. los estados de fallo no invocan al writer;
6. un error del writer devuelve `error_persistencia` y no modifica el jugador local.

Debe ejecutarse además el test controlado de SC-005 con al menos 20 casos y verificar que el ratio de matching correcto cumple el umbral definido por la spec, sin usar datos live.

## Integración posterior del catálogo

Cuando se integre la rama del catálogo:

1. conectar el lookup y el writer con `players.repository.ts` y su implementación real;
2. inspeccionar nuevamente `backend/migrations/` y crear una migración con timestamp concreto posterior a la migración real de jugadores;
3. agregar `estadisticas-jugador.entity.ts` con foreign key a `JugadorEntity`;
4. registrar providers en `players.module.ts` sin agregar endpoints ni tocar Football-Data;
5. ejecutar las migraciones en orden y los tests de integración con PostgreSQL/Testcontainers.

No se crea una tabla de jugadores temporal y no se aplica una migración de foreign key mientras falte la migración real del catálogo.

## Smoke test opcional de WhoScored

Con un jugador público de prueba, el smoke test puede verificar manualmente:

- `GET /search/?t={nombre}` devuelve candidatos;
- el perfil contiene `require.config.params['args'].tournaments`;
- el matching confirma nombre, equipo y liga;
- `Goals`, `Assists`, `TotalShots`, `KeyPasses`, `Dribbles`, `TotalTackles` y `Rating` se mapean correctamente.

El smoke test no es requisito de CI. Si WhoScored está bloqueado o cambia su estructura, el resultado esperado es un estado clasificado, nunca estadísticas inventadas.
