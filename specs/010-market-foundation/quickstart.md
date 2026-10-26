# Guía de validación: Fundamentos del mercado de jugadores

## Prerrequisitos

- Node.js 22.11.x y npm 10 o superior.
- Docker/Podman disponible para Testcontainers.
- PostgreSQL disponible para ejecución local si se validan migraciones manualmente.
- Variables habituales del backend (`DATABASE_URL`, `JWT_SECRET` fuera de tests) y, para
  probar el bootstrap de Mercado, `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD` válidos.
- `MARKET_TOKENIZATION_REQUIRE_STATS=true` para emitir tokens únicamente para jugadores con
  al menos una fila en `estadisticas_jugadores`; con `false` se consideran todos los jugadores
  del catálogo.

## Preparación

Desde `backend/`:

```bash
npm ci
npm run build
npm run lint
npm run migration:run
```

Las migraciones deben crear o actualizar, en orden, el historial de apertura,
`saldos_usuario`, `tokens` y `tenencias_jugador`. Las migraciones no deben emitir tokens por
sí mismas.

## Registro y saldo inicial

1. Ejecutar `POST /auth/register` con un correo nuevo y una contraseña válida.
2. Verificar HTTP 201, rol `usuario`, ausencia de contraseña en la respuesta y contrato
   público sin campos nuevos obligatorios.
3. Consultar PostgreSQL de forma directa en el entorno de validación y comprobar una sola
   fila en `saldos_usuario` con `creditos_disponibles = 1000000`.
4. Repetir el registro con el mismo correo normalizado y comprobar HTTP 409, una sola cuenta y
   un solo saldo.
5. Simular un error de persistencia del saldo en un test de repositorio y comprobar rollback
   de `usuarios`.

## Inicialización del suministro

1. Cargar al menos dos jugadores en el catálogo local y, si
   `MARKET_TOKENIZATION_REQUIRE_STATS=true`, guardar estadísticas para los jugadores que se
   quieran tokenizar.
2. Configurar el superusuario existente mediante `SUPERADMIN_EMAIL` y
   `SUPERADMIN_PASSWORD`; no crear otra cuenta administrativa.
3. Ejecutar el caso de uso interno de inicialización del Mercado durante el bootstrap o desde
   el harness de integración.
4. Verificar por jugador elegible según `MARKET_TOKENIZATION_REQUIRE_STATS`:
   - 100 filas en `tokens`;
   - `numero_emision` del 1 al 100, sin duplicados;
   - propietario inicial igual al superusuario;
   - una fila de tenencia del superusuario con cantidad 100;
   - una única fila `apertura_mercado` con valor `1.00`;
   - ninguna cotización almacenada en `tokens`.
5. Ejecutar la inicialización tres veces y en dos workers concurrentes. El resultado debe
   conservar 100 tokens, una apertura y las tenencias, sin cambiar propietarios.
6. Insertar un jugador nuevo, ejecutar nuevamente el caso de uso y comprobar que solo se
   crea su emisión faltante.
7. Preparar una emisión parcial y comprobar que la ejecución falla y revierte la transacción.

## Historial de cotizaciones

Consultar `GET /players/{id}/quotes` y verificar que las cotizaciones calculadas existentes
conservan su respuesta actual. Para una apertura, `tipoEstrategia` es `apertura_mercado`,
`cotizacion` es `1.00`, `idVersionEstrategia` contiene la versión estable de apertura y
`idRecalculo`/`idEstadistica` son `null`. La paginación, ruta y errores existentes no cambian.

## Tests

```bash
npm run test:unit
npm run test:integration
```

Los tests unitarios deben cubrir `Creditos`, `SaldoUsuario`, `TokenJugador`,
`TenenciaJugador`, registro y reintentos. Los de integración deben ejecutar las migraciones
contra PostgreSQL/Testcontainers y cubrir FK, checks, unicidad, rollback y concurrencia.

Los helpers pueden adaptar migraciones y orden de limpieza por las nuevas FK, pero las
assertions de tests existentes no deben modificarse ni eliminarse.

## Evidencia de cierre

Conservar salida de `build`, `lint`, tests unitarios, tests de integración, ejecución de
migraciones y consultas de conteo. No marcar la feature como terminada si la apertura usa
referencias artificiales, si una emisión parcial queda persistida o si algún test existente
fue modificado sin autorización.
