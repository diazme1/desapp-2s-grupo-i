import { DataSource } from 'typeorm';
import { User } from '../domain/user';
import { UserRepository } from '../users.repository';
import { UserEntity } from './user.entity';

export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) await this.dataSource.destroy();
  }

  async create(user: User): Promise<User> {
    const entity = this.dataSource.getRepository(UserEntity).create({
      id: user.id,
      correo: user.correo,
      passwordHash: user.passwordHash,
      creadoEn: user.creadoEn,
    });
    await this.dataSource.getRepository(UserEntity).save(entity);
    return User.create(entity);
  }

  async findByEmail(correo: string): Promise<User | null> {
    const entity = await this.dataSource.getRepository(UserEntity).findOne({
      where: { correo: correo.trim().toLowerCase() },
    });
    return entity ? User.create(entity) : null;
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.dataSource.getRepository(UserEntity).findOne({ where: { id } });
    return entity ? User.create(entity) : null;
  }
}
