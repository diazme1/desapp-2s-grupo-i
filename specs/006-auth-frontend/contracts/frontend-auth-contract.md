# Contrato de interfaz: autenticación del frontend

## Rutas públicas

| Ruta | Propósito | Elementos mínimos |
|---|---|---|
| `/login` | Iniciar sesión | Correo, contraseña, botón de ingreso, enlace a registro, mensaje de error |
| `/register` | Crear cuenta | Correo, contraseña, confirmación, botón de registro, enlace a login, mensajes de validación |

## Ruta protegida provisional

| Ruta | Propósito | Comportamiento |
|---|---|---|
| `/app` | Confirmar acceso autenticado | Muestra el correo del usuario, estado de sesión y acción de cerrar sesión |

El acceso directo a `/app` sin sesión válida redirige a `/login`.

## Integración con el backend existente

### Registro

```text
POST /auth/register
Body: { correo: string, password: string }
Éxito: 201 con Usuario público
Errores: 409 correo existente, 422 datos inválidos
```

La confirmación local de contraseña no se envía.

### Login

```text
POST /auth/login
Body: { correo: string, password: string }
Éxito: 200 con { accessToken, tokenType, expiresIn }
Error: 401 credenciales inválidas
```

### Identidad actual

```text
GET /auth/me
Header: Authorization: Bearer <accessToken>
Éxito: 200 con Usuario público
Errores: 401 token ausente, inválido o vencido; 403 sin permiso
```

## Reglas de interacción

- Los botones muestran estado de carga y quedan deshabilitados mientras hay una solicitud.
- Los errores se muestran en español y no distinguen si un correo existe cuando el login falla.
- Los campos tienen etiquetas visibles, `autocomplete` apropiado, foco visible y navegación
  completa por teclado.
- Los mensajes de éxito o error no muestran contraseñas ni el token.
- El cierre de sesión limpia la sesión local y lleva a `/login`.

## Convención de desarrollo local

La aplicación utiliza `/api` como prefijo local y Vite lo redirige al backend en
`http://localhost:3000`, quitando el prefijo antes de enviar la solicitud. La URL base
puede configurarse mediante `VITE_API_BASE_URL`.
