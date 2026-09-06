# Guía de verificación local: app base

Esta guía describe comandos y verificaciones que deberán estar disponibles al terminar
implement. Todavía no existe la aplicación y estos comandos no se ejecutaron como prueba.

## Prerrequisitos

- Node.js 22.11.0, y npm incluido.
- Git y acceso inicial a la fuente de dependencias.
- Postman para verificar la colección compartida y navegador para Swagger.
- No se requieren PostgreSQL, Docker ni credenciales.

Se utiliza el Node 22.11.0 instalado, sin activar .tools.

## Instalación y compilación

Desde la raíz de una copia limpia del repositorio, en PowerShell:

```powershell
node --version
npm.cmd --version
cd backend
npm.cmd ci
npm.cmd run build
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run start:prod
```

Resultado esperado: instalación y build exitosos, ambas suites verdes y mensaje de
servidor disponible. package-lock.json y los scripts anteriores se crearán en implement.
El script start:prod debe apuntar a la salida real del compilador. Para desarrollo se
proveerá también `npm.cmd run start:dev`.

## Salud y documentación

En otra terminal:

```powershell
$response = Invoke-WebRequest http://localhost:3000/health
$response.StatusCode
$response.Headers['Content-Type']
$response.Content
1..10 | ForEach-Object { (Invoke-WebRequest http://localhost:3000/health).StatusCode }
```

Esperado: 200, application/json y exactamente {"status":"ok"}, sin campos adicionales;
las diez peticiones deben devolver 200. Referencia: [contrato](contracts/openapi.yaml).

Abrir http://localhost:3000/docs y ejecutar GET /health sin credenciales. Consultar
http://localhost:3000/docs-json y verificar ruta, schema, estado y ausencia de seguridad.
Importar `docs/postman/app-base.postman_collection.json`, ajustar baseUrl si es necesario
y ejecutar la petición. Sus comprobaciones de status, tipo de contenido y cuerpo deben pasar.

## Casos borde y reinicio

1. Sin .env ni PORT del proceso, comprobar el arranque en 3000.
2. Detener con Ctrl+C y reiniciar con start:prod; la consulta debe volver a responder.
3. Con el primer servidor aún activo en 3000, intentar iniciar una segunda instancia
   en el mismo puerto. Debe terminar con error no cero y mensaje en español; el primer
   servidor debe seguir respondiendo. No detener procesos ajenos.
4. En una terminal de prueba, verificar un puerto inválido:

```powershell
$env:PORT = 'invalido'
npm.cmd run start:prod
$LASTEXITCODE
Remove-Item Env:PORT
```

Esperado: error en español y código distinto de cero, sin mensaje de disponibilidad.
Los unitarios cubrirán además 1, 65535, 3000, ausencia, vacío, 0, negativos, decimales y 65536.

5. Cambiar de puerto sin editar código:

```powershell
$env:PORT = '3001'
npm.cmd run start:prod
```

Consultar /health y /docs en el puerto 3001; configurar Postman con esa dirección.
Después de detener el proceso, eliminar la variable de esa terminal con
`Remove-Item Env:PORT`. Usar una terminal dedicada para no alterar una configuración previa.

6. Consultar /ruta-inexistente: debe devolver 404 y un mensaje en español. PowerShell
   puede lanzar una excepción al recibir 404; verificar el código en su respuesta o
   usar Postman. No debe recibirse status ok.
7. Con el proceso detenido, una petición debe fallar por conexión; no confundirlo con
   una respuesta HTTP del servidor.

## Evidencia de cierre

Registrar en la entrega versiones, comandos ejecutados, resultados de suites, build,
arranque y casos HTTP; documentar cualquier comprobación no realizada. No declarar éxito
solo porque los documentos están completos. No modificar ni eliminar tests existentes
sin autorización explícita para el cambio concreto.


