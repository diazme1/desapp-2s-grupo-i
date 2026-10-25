# Investigación

- La API ya tiene JWT con rol en el token; el registro público crea `usuario` y existe bootstrap idempotente de superadmin.
- `WhoScoredAdapter` guarda tiros, pases clave, regates, faltas y rating como valores decimales con hasta dos cifras; no normaliza todas las métricas a enteros. La tabla de estadísticas no tenía fecha de captura.
- El historial y su migración ya existen, pero aún no hay escritor de cotizaciones ni corridas/estrategias persistidas.
- Decisión: aplicar pesos directamente a los valores guardados; usar BigInt en centavos, base 1 crédito, división por 100, faltas negativas y tope inferior cero.
- Para seleccionar el registro reciente se agrega fecha de captura; registros viejos reciben fecha de migración, por lo que solo se puede desempatar establemente por UUID.
