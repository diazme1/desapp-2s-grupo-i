import { DataSource } from 'typeorm';
import { User } from '../domain/user';
import { Creditos } from '../../market/domain/creditos';
import { SaldoUsuario } from '../domain/saldo-usuario';
import { UserRepository } from '../users.repository';
import { SaldoUsuarioEntity } from './saldo-usuario.entity';
import { UserEntity } from './user.entity';

export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) await this.dataSource.destroy();
  }

  async create(
    user: User,
    options: { saldoInicial?: Creditos } = {},
  ): Promise<User> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const entity = manager.getRepository(UserEntity).create({
        id: user.id,
        correo: user.correo,
        passwordHash: user.passwordHash,
        rol: user.rol,
        creadoEn: user.creadoEn,
      });
      await manager.getRepository(UserEntity).save(entity);
      if (options.saldoInicial !== undefined) {
        const saldo = SaldoUsuario.crear({
          id: user.id,
          usuarioId: user.id,
          creditosDisponibles: options.saldoInicial,
          creadoEn: user.creadoEn,
          actualizadoEn: user.creadoEn,
        });
        await manager.getRepository(SaldoUsuarioEntity).save({
          usuarioId: saldo.usuarioId,
          creditosDisponibles: saldo.creditosDisponibles.toUnidades(),
          creadoEn: saldo.creadoEn,
          actualizadoEn: saldo.actualizadoEn,
        });
      }
      return entity;
    });
    return User.create(saved);
  }

  async findByEmail(correo: string): Promise<User | null> {
    const entity = await this.dataSource.getRepository(UserEntity).findOne({
      where: { correo: correo.trim().toLowerCase() },
    });
    return entity ? User.create(entity) : null;
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { id } });
    return entity ? User.create(entity) : null;
  }
}
