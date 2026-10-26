import 'dotenv/config';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/persistence/user.entity';
import { SaldoUsuarioEntity } from '../users/persistence/saldo-usuario.entity';
import { EquipoEntity } from '../players/persistence/equipo.entity';
import { EstadisticasJugadorEntity } from '../players/persistence/estadisticas-jugador.entity';
import { JugadorEntity } from '../players/persistence/jugador.entity';
import { LigaEntity } from '../players/persistence/liga.entity';
import { HistorialCotizacionEntity } from '../players/persistence/historial-cotizacion.entity';
import { TokenJugadorEntity } from '../market/persistence/token-jugador.entity';
import { TenenciaJugadorEntity } from '../market/persistence/tenencia-jugador.entity';

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
    TokenJugadorEntity,
    TenenciaJugadorEntity,
  ],
  migrations: ['migrations/*.ts'],
  synchronize: false,
});
