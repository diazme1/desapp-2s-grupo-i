import { User } from './domain/user';
import { Creditos } from '../market/domain/creditos';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  create(user: User, options?: { saldoInicial?: Creditos }): Promise<User>;
  findByEmail(correo: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}
