# Guía de verificación local: autenticación con JWT

## Prerrequisitos

- Node.js 22.11.0 y npm 10 o superior.
- PostgreSQL disponible para ejecución local o Docker para Testcontainers.
- Un secreto JWT configurado en el entorno; nunca usar un secreto de ejemplo en un entorno
  compartido.

## Preparación

Desde `backend/`:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd start:dev
```

La ruta `/health` debe continuar respondiendo sin token.

## Registro y login

Registrar una cuenta con `POST /auth/register`:

```json
{
  "correo": "usuario@example.com",
  "password": "una-clave-segura"
}
```

Verificar que la respuesta no contiene la contraseña. Luego iniciar sesión con
`POST /auth/login` y guardar el campo `accessToken`.

## Ruta protegida

Consultar `GET /auth/me` con:

```text
Authorization: Bearer <accessToken>
```

Esperado: HTTP 200 y la identidad del usuario. Repetir la consulta sin encabezado, con un
token alterado y con un token vencido; cada caso debe responder HTTP 401.

## Propiedad de datos

Autenticarse como usuario A e intentar consultar o modificar un recurso de usuario B. La
operación debe responder HTTP 403, no entregar datos de B y no modificar su información.
El servidor debe obtener la identidad desde el JWT, aunque el cliente envíe otro `userId`.

## Casos de registro y login

- Registrar el mismo correo dos veces: la segunda solicitud debe responder HTTP 409.
- Registrar un correo o contraseña inválidos: debe responder HTTP 422.
- Iniciar sesión con contraseña incorrecta o correo inexistente: debe responder HTTP 401
  sin revelar cuál dato falló.
- Revisar logs y respuestas: no deben contener contraseñas, secretos ni tokens completos.
- Abrir `/docs` y verificar los esquemas de registro, login y autorización Bearer.

## Evidencia

Registrar versiones, migraciones, comandos, resultados de tests y respuestas HTTP. No marcar
la feature como terminada hasta comprobar que las rutas protegidas rechazan todos los casos
de token inválido y que los tests existentes de la app base siguen pasando.
