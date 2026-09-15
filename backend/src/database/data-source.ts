import 'dotenv/config';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/persistence/user.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [UserEntity],
  migrations: ['migrations/*.ts'],
  synchronize: false,
});
