# Validación rápida

Desde `backend/`, con PostgreSQL disponible y migraciones aplicadas:

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run test:integration -- --testPathPatterns=quote-recalculate
```

Iniciar sesión con `admin@gmail.com` / `admin` (la cuenta se crea al iniciar desde `.env.example`) y enviar `POST /quotes/recalculate` con una estrategia v1. Verificar ambas filas vigentes por jugador y consultar `GET /players/ranking` y `GET /players/ranking?estrategia=creacion_tecnica`; el filtro no recalcula. Confirmar que el historial agregó ambas estrategias. Repetir con un usuario común (403), sin JWT (401) y con estrategia inválida (422). Forzar un error de escritura y verificar que el puntero activo, el historial y las dos cotizaciones vigentes anteriores no cambien.
