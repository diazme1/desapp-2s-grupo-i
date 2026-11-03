# Tests e2e

Las suites de esta carpeta ejercitan la API HTTP completa con PostgreSQL real.

Cada caso mantiene esta secuencia:

1. **Set up**: preparar datos, usuarios y credenciales.
2. **Execute**: ejecutar la petición HTTP que representa el recorrido.
3. **Assert**: verificar el status y el contrato observable.

Las pruebas de repositorios, migraciones y constraints de PostgreSQL quedan fuera de e2e; esos detalles se validan en unit tests o se incorporarán en una estrategia específica de persistencia si vuelve a ser necesario.

Para ejecutar la suite:

```sh
npm run test:e2e
```
