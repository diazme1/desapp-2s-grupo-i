import 'dotenv/config';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/persistence/user.entity';
import { SaldoUsuarioEntity } from '../users/persistence/saldo-usuario.entity';
import { EquipoEntity } from '../players/persistence/equipo.entity';
import { EstadisticasJugadorEntity } from '../players/persistence/estadisticas-jugador.entity';
import { JugadorEntity } from '../players/persistence/jugador.entity';
import { LigaEntity } from '../players/persistence/liga.entity';
import { HistorialCotizacionEntity } from '../quotes/persistence/historial-cotizacion.entity';
import { CotizacionVigenteEntity } from '../quotes/persistence/cotizacion-vigente.entity';
import { VersionEstrategiaCotizacionEntity } from '../quotes/persistence/version-estrategia-cotizacion.entity';
import { RecalculoCotizacionEntity } from '../quotes/persistence/recalculo-cotizacion.entity';
import { RecalculoCotizacionActivoEntity } from '../quotes/persistence/recalculo-cotizacion-activo.entity';
import { TokenJugadorEntity } from '../market/persistence/token-jugador.entity';
import { TenenciaJugadorEntity } from '../market/persistence/tenencia-jugador.entity';
import { TransaccionMercadoEntity } from '../market/orders/persistence/transaccion-mercado.entity';
import { AuditoriaTransaccionEntity } from '../market/orders/persistence/auditoria-transaccion.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    UserEntity,
    SaldoUsuarioEntity,
    LigaEntity,
    EquipoEntity,
    JugadorEntity,
    EstadisticasJugadorEntity,
    HistorialCotizacionEntity,
    CotizacionVigenteEntity,
    VersionEstrategiaCotizacionEntity,
    RecalculoCotizacionEntity,
    RecalculoCotizacionActivoEntity,
    TokenJugadorEntity,
    TenenciaJugadorEntity,
    TransaccionMercadoEntity,
    AuditoriaTransaccionEntity,
  ],
  migrations: ['migrations/*.ts'],
  synchronize: false,
});
