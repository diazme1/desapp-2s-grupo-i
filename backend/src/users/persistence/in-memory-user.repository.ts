import { User } from '../domain/user';
import { UserRepository } from '../users.repository';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async create(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async findByEmail(correo: string): Promise<User | null> {
    const normalized = correo.trim().toLowerCase();
    return [...this.users.values()].find((user) => user.correo === normalized) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
}
