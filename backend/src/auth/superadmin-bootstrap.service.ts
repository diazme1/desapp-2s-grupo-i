import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../users/domain/user';
import { USER_REPOSITORY } from '../users/users.repository';
import type { UserRepository } from '../users/users.repository';
import { BcryptPasswordHasher } from './strategies/password-hasher';

@Injectable()
export class SuperadminBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly hasher: BcryptPasswordHasher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const correo = this.config.get<string>('SUPERADMIN_EMAIL');
    const password = this.config.get<string>('SUPERADMIN_PASSWORD');
    if (!correo && !password) return;
    if (!correo || !password) {
      throw new Error(
        'SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD deben configurarse juntos.',
      );
    }

    const existing = await this.users.findByEmail(correo);
    if (existing) {
      if (existing.rol !== UserRole.SUPERADMIN) {
        throw new Error(
          'SUPERADMIN_EMAIL ya pertenece a una cuenta común; no se promovió automáticamente.',
        );
      }
      return;
    }

    const superadmin = User.create({
      correo,
      passwordHash: await this.hasher.hash(password),
      rol: UserRole.SUPERADMIN,
    });
    try {
      await this.users.create(superadmin);
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;
      const racedUser = await this.users.findByEmail(correo);
      if (racedUser?.rol !== UserRole.SUPERADMIN) throw error;
    }
  }
}
