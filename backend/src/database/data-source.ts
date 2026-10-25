import 'dotenv/config';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/persistence/user.entity';
import { EquipoEntity } from '../players/persistence/equipo.entity';
import { EstadisticasJugadorEntity } from '../players/persistence/estadisticas-jugador.entity';
import { JugadorEntity } from '../players/persistence/jugador.entity';
import { LigaEntity } from '../players/persistence/liga.entity';
import { HistorialCotizacionEntity } from '../players/persistence/historial-cotizacion.entity';
import { CotizacionVigenteEntity } from '../players/persistence/cotizacion-vigente.entity';
import { VersionEstrategiaCotizacionEntity } from '../players/persistence/version-estrategia-cotizacion.entity';
import { RecalculoCotizacionEntity } from '../players/persistence/recalculo-cotizacion.entity';
import { RecalculoCotizacionActivoEntity } from '../players/persistence/recalculo-cotizacion-activo.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    UserEntity,
    LigaEntity,
    EquipoEntity,
    JugadorEntity,
    EstadisticasJugadorEntity,
    HistorialCotizacionEntity,
    CotizacionVigenteEntity,
    VersionEstrategiaCotizacionEntity,
    RecalculoCotizacionEntity,
    RecalculoCotizacionActivoEntity,
  ],
  migrations: ['migrations/*.ts'],
  synchronize: false,
});
