# Data Model: Usuarios y autenticación con JWT

## Usuario

Representa la identidad que puede autenticarse y operar posteriormente en el mercado.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| id | Identificador | Único, generado por el sistema y estable. |
| correo | Texto | Obligatorio, normalizado y único. |
| passwordHash | Texto secreto | Obligatorio; nunca contiene la contraseña original. |
| creadoEn | Fecha/hora | Obligatoria; se asigna al crear la cuenta. |

### Invariantes

- No existen dos usuarios con el mismo correo normalizado.
- Un usuario creado tiene siempre una credencial protegida.
- La contraseña original no se puede reconstruir a partir de los datos almacenados.

## Token de acceso

Es una representación temporal de la autorización de un usuario; no se persiste como parte
de esta feature.

| Claim | Reglas |
|---|---|
| `sub` | Identificador del usuario autenticado. |
| `iat` | Fecha/hora de emisión. |
| `exp` | Fecha/hora de vencimiento posterior a `iat`. |

### Transiciones

```text
Sin cuenta -> Registrado -> Autenticado con JWT vigente
                                  |
                                  -> JWT vencido o inválido -> No autorizado
```

## Relaciones futuras

El usuario será referenciado por posiciones, operaciones y auditorías de las features del
mercado. Esas relaciones no se crean en esta feature.
