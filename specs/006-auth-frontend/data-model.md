# Data Model: Autenticación del frontend

## Formulario de registro

Representa los datos ingresados antes de crear una cuenta.

| Campo | Tipo | Reglas |
|---|---|---|
| `correo` | string | Obligatorio, formato email, se recortan espacios laterales |
| `password` | string | Obligatorio, mínimo 8 caracteres, nunca se persiste como texto plano |
| `confirmacionPassword` | string | Obligatorio en la UI, debe coincidir con `password`, no se envía al backend |

## Formulario de login

| Campo | Tipo | Reglas |
|---|---|---|
| `correo` | string | Obligatorio, formato email, se recortan espacios laterales |
| `password` | string | Obligatorio, mínimo 8 caracteres |

## Usuario público

Representa la identidad que puede mostrarse después del registro o al recuperar la sesión.
No contiene contraseña ni hash.

| Campo | Tipo | Fuente |
|---|---|---|
| `id` | string | Respuesta de registro o `/auth/me` |
| `correo` | string | Respuesta de registro o `/auth/me` |
| `creadoEn` | fecha-hora | Respuesta de registro o `/auth/me` |

## Respuesta de token

| Campo | Tipo | Reglas |
|---|---|---|
| `accessToken` | string | Credencial temporal; se mantiene fuera de la UI visible |
| `tokenType` | `Bearer` | Se utiliza para formar la autorización de requests protegidos |
| `expiresIn` | number | Segundos de validez informados por el backend |

## Sesión autenticada

| Campo | Tipo | Reglas |
|---|---|---|
| `accessToken` | string | Obligatorio mientras la sesión esté activa |
| `tokenType` | string | Debe ser `Bearer` para este contrato |
| `expiresAt` | number | Derivado de la hora de login y `expiresIn` |
| `user` | Usuario público | Se obtiene desde el servicio de usuario actual |

### Estados

```text
anonymous -> authenticating -> authenticated
authenticated -> signing-out -> anonymous
authenticated -> expired -> anonymous
authenticating -> error -> anonymous
```

Una respuesta 401 del backend lleva la sesión a `anonymous` y redirige al login. Una
respuesta 403 se muestra como falta de permisos sin inventar una identidad alternativa.
