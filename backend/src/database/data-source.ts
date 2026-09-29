import 'dotenv/config';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/persistence/user.entity';
import { EquipoEntity } from '../players/persistence/equipo.entity';
import { EstadisticasJugadorEntity } from '../players/persistence/estadisticas-jugador.entity';
import { JugadorEntity } from '../players/persistence/jugador.entity';
import { LigaEntity } from '../players/persistence/liga.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [UserEntity, LigaEntity, EquipoEntity, JugadorEntity, EstadisticasJugadorEntity],
  migrations: ['migrations/*.ts'],
  synchronize: false,
});
