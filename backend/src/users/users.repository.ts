import { User } from './domain/user';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  create(user: User): Promise<User>;
  findByEmail(correo: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}
