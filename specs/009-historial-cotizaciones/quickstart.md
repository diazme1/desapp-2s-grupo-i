# Validación

Desde `backend/`, con PostgreSQL configurado y migraciones aplicadas:

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run test:integration
```

Consultar `GET /players/{id}/quotes?page=1&limit=20`; revisar orden, totales, vacío, `404` y `422` según [contrato](contracts/quotes-history.md). El bootstrap se valida con ambas variables `SUPERADMIN_*`; un segundo inicio no debe duplicar la cuenta. Integración requiere PostgreSQL/Testcontainers.
