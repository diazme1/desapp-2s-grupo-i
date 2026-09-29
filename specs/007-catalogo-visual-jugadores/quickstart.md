# Quickstart: Catálogo visual de jugadores

Guía de validación manual de la feature. No incluye implementación ni tests automatizados.

## Prerrequisitos

- Node.js y npm disponibles.
- PostgreSQL y backend levantados, o Docker Compose funcionando.
- Un usuario registrado para iniciar sesión.
- Catálogo local cargado con al menos una liga; para probar filtros completos, cargar las ligas configuradas.
- El frontend configurado con la URL del backend mediante `VITE_API_BASE_URL` o el proxy local de Vite.

## Levantar el entorno

Desde la raíz del repositorio:

```powershell
docker compose up --build
```

Alternativamente, levantar el backend y PostgreSQL según la documentación del proyecto y luego iniciar el frontend:

```powershell
cd frontend
npm install
npm run dev
```

Abrir `http://localhost:5173`.

## Preparar datos

1. Registrarse o iniciar sesión.
2. Ejecutar el refresh del catálogo desde la colección Postman existente o desde el endpoint autenticado:

```http
POST /catalog/refresh
```

3. Esperar a que la actualización termine y volver a abrir `/app`.
4. Para probar todas las ligas, confirmar que `FOOTBALL_DATA_COMPETITIONS` contiene `PL,BL1,PD,SA,FL1` y que no existe un límite restrictivo en `FOOTBALL_DATA_MAX_TEAMS`.

## Escenarios manuales

### 1. Carga inicial

- Iniciar sesión.
- Verificar que `/app` muestra “Catálogo de jugadores”.
- Confirmar que se muestra un estado de carga y luego una card por cada jugador recibido.
- Confirmar que una respuesta vacía muestra un estado de catálogo vacío, no una grilla vacía sin explicación.

### 2. Cards y datos opcionales

- Verificar nombre, equipo, liga y posición cuando estén disponibles.
- Verificar que un jugador sin `fotoUrl` muestra un placeholder.
- Confirmar que no se muestran datos inventados cuando faltan valores.

### 3. Filtros

- Buscar por una parte del nombre.
- Seleccionar una liga.
- Seleccionar un equipo.
- Filtrar jugadores con y sin estadísticas.
- Combinar dos o más filtros.
- Limpiar los filtros y confirmar que vuelve el catálogo completo.
- Usar una combinación sin resultados y verificar el mensaje y la acción para limpiar.

### 4. Estadísticas disponibles

- Seleccionar una card marcada como disponible.
- Confirmar que navega a `/app/players/:id/estadisticas`.
- Verificar el estado de carga del detalle.
- Confirmar que los valores recibidos se muestran y que un valor `0` aparece como cero.
- Confirmar que los campos `null` o ausentes aparecen como “No disponible”.

### 5. Endpoint de estadísticas pendiente

- Usar un jugador cuyo `GET /players/:id` devuelva `estadisticas: []`, o simular una respuesta sin el campo.
- Confirmar que se muestra “Estadísticas no disponibles”.
- Verificar que la pantalla no queda vacía y que existe una acción para volver al catálogo.
- Repetir con respuesta 404, error de red o indisponibilidad temporal.

### 6. Accesibilidad básica

- Recorrer la pantalla usando solamente teclado.
- Confirmar foco visible en búsqueda, selects, limpieza, cards activables y regreso.
- Confirmar que las cards sin estadísticas pueden abrir una ficha segura y que la ficha informa “Estadísticas no disponibles”.

## Validaciones locales

Desde `frontend`:

```powershell
npm run lint
npm run build
```

Los tests automatizados de frontend quedan fuera del alcance de esta iteración. No modificar ni eliminar los tests existentes.

## Referencias

- Datos y estados: [data-model.md](./data-model.md)
- Contrato REST compatible: [contracts/frontend-player-catalog.md](./contracts/frontend-player-catalog.md)
- Reglas y decisiones: [research.md](./research.md)
