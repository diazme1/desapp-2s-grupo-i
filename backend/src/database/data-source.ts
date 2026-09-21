import 'dotenv/config';
import { DataSource } from 'typeorm';
import { EquipoEntity } from '../players/persistence/equipo.entity';
import { IdentidadExternaJugadorEntity } from '../players/persistence/identidad-externa-jugador.entity';
import { JugadorEntity } from '../players/persistence/jugador.entity';
import { LigaEntity } from '../players/persistence/liga.entity';
import { UserEntity } from '../users/persistence/user.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [UserEntity, LigaEntity, EquipoEntity, JugadorEntity, IdentidadExternaJugadorEntity],
  migrations: ['migrations/*.ts'],
  synchronize: false,
});
