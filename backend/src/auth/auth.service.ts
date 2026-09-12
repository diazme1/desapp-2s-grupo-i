import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { User } from '../users/domain/user';
import { USER_REPOSITORY } from '../users/users.repository';
import type { UserRepository } from '../users/users.repository';
import { BcryptPasswordHasher } from './strategies/password-hasher';
import { JwtTokenService } from './strategies/jwt-token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface PublicUser {
  id: string;
  correo: string;
  creadoEn: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly hasher: BcryptPasswordHasher,
    private readonly tokens: JwtTokenService,
  ) {}

  async register(input: RegisterDto): Promise<PublicUser> {
    const correo = input.correo.trim().toLowerCase();
    if (await this.users.findByEmail(correo)) throw new ConflictException('El correo ya está registrado.');
    const user = User.create({
      id: randomUUID(),
      correo,
      passwordHash: await this.hasher.hash(input.password),
    });
    let saved: User;
    try {
      saved = await this.users.create(user);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('El correo ya está registrado.');
      }
      throw error;
    }
    return this.publicUser(saved);
  }

  async login(input: LoginDto) {
    const user = await this.users.findByEmail(input.correo.trim().toLowerCase());
    if (!user || !(await this.hasher.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    return {
      accessToken: this.tokens.sign({ sub: user.id, correo: user.correo }),
      tokenType: 'Bearer',
      expiresIn: this.tokens.expirationSeconds(),
    };
  }

  async me(id: string): Promise<PublicUser> {
    const user = await this.users.findById(id);
    if (!user) throw new UnauthorizedException('Usuario no encontrado.');
    return this.publicUser(user);
  }

  private publicUser(user: User): PublicUser {
    return { id: user.id, correo: user.correo, creadoEn: user.creadoEn };
  }
}
