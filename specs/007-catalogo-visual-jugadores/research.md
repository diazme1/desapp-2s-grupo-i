# Research: Catálogo visual de jugadores

## 1. Integración con el frontend existente

**Decision**: Reutilizar React, TypeScript, React Router, `AuthContext`, `ProtectedRoute` y `shared/http-client.ts`.

**Rationale**: Son las piezas ya utilizadas por la autenticación y la sesión. El cliente HTTP ya centraliza la URL base, los errores de red y la invalidación de sesión ante respuestas 401.

**Alternatives considered**:

- Crear un cliente HTTP nuevo: rechazado porque duplicaría manejo de errores y autenticación.
- Incorporar una librería de UI o de manejo de datos: rechazada porque la feature es acotada y el proyecto no tiene una dependencia equivalente instalada.

## 2. Carga y filtrado del catálogo

**Decision**: Cargar el catálogo completo con `GET /players` y resolver en la vista la búsqueda por nombre, el filtro por equipo y la disponibilidad de estadísticas. Mantener `ligaCodigo` como capacidad compatible del backend, pero no depender de una consulta por cada cambio de filtro.

**Rationale**: El endpoint actual solo acepta `ligaCodigo`. Una carga única permite combinar los cuatro filtros sin agregar endpoints ni hacer una solicitud por cada interacción. La escala definida para la validación es un catálogo de al menos 50 jugadores, suficiente para esta primera pantalla.

**Alternatives considered**:

- Solicitar al backend filtros de nombre y equipo: se posterga porque no son necesarios para el primer catálogo y ampliarían el alcance backend.
- Consultar el backend por cada filtro: rechazado por mayor latencia y por no estar soportado por el contrato actual.
- Filtrar únicamente por liga: rechazado porque no cumple el alcance funcional de la feature.

## 3. Disponibilidad de estadísticas en las cards

**Decision**: El listado puede aceptar un campo opcional equivalente a `estadisticasDisponibles`. Si el campo no llega, la UI tratará la disponibilidad como desconocida/no disponible, pero permitirá abrir una ficha segura bajo demanda para consultar el arreglo real del detalle.

**Rationale**: El `JugadorResponseDto` actual no expone estadísticas ni un indicador de existencia. Consultar el detalle de todos los jugadores para descubrirlo produciría muchas solicitudes y haría lenta la pantalla. Un indicador opcional en el listado permite compatibilidad hacia atrás y una integración progresiva.

**Alternatives considered**:

- Hacer una consulta de detalle por jugador: rechazada por el costo de red y por el riesgo de saturar el endpoint pendiente.
- Mostrar todos los jugadores como seleccionables: aceptado porque el detalle tiene un estado válido para `estadisticas: []` y evita consultas masivas previas.
- Ocultar jugadores sin estadísticas: rechazado porque el catálogo debe mostrar también esos jugadores.

## 4. Contrato del detalle de estadísticas

**Decision**: El frontend acepta el contrato actualizado de `GET /players/:id`: datos base más un arreglo `estadisticas`, que puede estar vacío o contener una o más observaciones. La primera versión muestra la última observación recibida; un valor numérico `0` siempre se considera válido.

**Rationale**: El endpoint ya expone las observaciones persistidas, pero puede devolver un arreglo vacío para jugadores sin estadísticas. El diseño tolerante conserva compatibilidad con respuestas base anteriores y permite revisar la pantalla antes de que todos los datos estén cargados.

**Alternatives considered**:

- Bloquear la feature hasta que exista el contrato final: rechazado porque el catálogo y sus filtros pueden desarrollarse independientemente.
- Tratar todos los valores ausentes como cero: rechazado porque confunde ausencia de datos con un rendimiento válido igual a cero.
- Fallar toda la pantalla cuando el detalle no tiene estadísticas: rechazado porque la indisponibilidad de WhoScored no debe interrumpir la lectura local.

## 5. Imágenes de jugadores

**Decision**: Consumir una foto solo si el backend la entrega; en cualquier otro caso mostrar un placeholder estable y accesible.

**Rationale**: El contrato actual no incluye una foto de jugador y la feature no debe incorporar una fuente externa nueva ni inventar imágenes.

**Alternatives considered**:

- Usar una URL externa fija: rechazada porque agrega una integración no solicitada.
- Ocultar la imagen cuando falta: rechazada porque la card debe mantener una estructura visual consistente.

## 6. Rutas y navegación

**Decision**: Mantener `/app` como entrada protegida del producto y mostrar allí el catálogo. Agregar `/app/players/:id/estadisticas` para el detalle, con una acción clara para volver.

**Rationale**: La aplicación ya protege `/app` y redirige allí después del login. Reutilizar esa entrada evita crear una superficie pública nueva y conserva el flujo de autenticación.

**Alternatives considered**:

- Crear una ruta pública para el catálogo: rechazada porque la spec exige usuario autenticado.
- Abrir estadísticas en un modal: rechazada para esta iteración porque una ruta permite manejar carga, error, retorno y acceso directo de forma más clara.

## 7. Validación y tests

**Decision**: Validar manualmente los escenarios de la spec, además de lint y build. No agregar tests frontend nuevos en esta iteración, sin modificar ni eliminar los existentes.

**Rationale**: Es una instrucción explícita del alcance solicitado. La excepción queda visible en el plan porque la constitución del proyecto normalmente exige cobertura.

**Alternatives considered**:

- Agregar tests de componentes y API ahora: técnicamente recomendable, pero fuera del alcance solicitado.
- Eliminar o modificar tests existentes: prohibido por la constitución y no necesario para la feature.
