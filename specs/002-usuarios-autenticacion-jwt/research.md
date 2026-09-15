# Research: Usuarios y autenticación con JWT

## Decisión 1: Flujo de autenticación

- **Decisión**: registro con correo y contraseña, login que devuelve un JWT Bearer y guard
  para endpoints protegidos. No se usan API keys.
- **Motivo**: satisface el requisito explícito de JWT y mantiene el acceso basado en una
  credencial temporal.
- **Alternativas consideradas**: API key directa (descartada por la decisión del equipo),
  OAuth y login social (fuera del alcance de la primera entrega).

## Decisión 2: Identidad y autorización

- **Decisión**: el identificador confiable es el `sub` del JWT; el `userId` recibido por el
  cliente se valida contra esa identidad y no puede elevar permisos. Un usuario que no sea
  propietario recibe 403.
- **Motivo**: evita acceso horizontal a datos personales y financieros.
- **Alternativas consideradas**: confiar en el `userId` del body o de la URL (descartado) y
  agregar roles administrativos (pospuesto).

## Decisión 3: Firma y configuración del token

- **Decisión**: usar un secreto provisto por el entorno, duración configurable y lista
  explícita de algoritmos permitidos. El JWT incluirá `sub`, `iat` y `exp`.
- **Motivo**: permite rotar secretos por entorno, rechazar tokens vencidos y evitar secretos
  embebidos en el código.
- **Alternativas consideradas**: tokens sin vencimiento (descartados) y refresh tokens
  (pospuestos para una feature posterior).

## Decisión 4: Protección de contraseñas

- **Decisión**: almacenar únicamente un hash con bcryptjs; comparar la contraseña en el
  Service de autenticación y nunca devolverla ni registrarla.
- **Motivo**: bcryptjs evita dependencias nativas difíciles de reproducir en Windows y
  conserva el comportamiento esperado de bcrypt.
- **Alternativas consideradas**: guardar contraseñas cifradas o en texto plano (descartadas
  porque permiten recuperar el secreto original).

## Decisión 5: Persistencia y pruebas

- **Decisión**: PostgreSQL con repositorio de usuarios y migración; las pruebas de
  integración de persistencia usarán PostgreSQL real con Testcontainers.
- **Motivo**: cumple la constitución y evita que SQLite o un repositorio en memoria oculten
  problemas del motor requerido.
- **Alternativas consideradas**: SQLite en tests y repositorio en memoria para integración
  (descartados; solo se permiten para unitarios aislados).
