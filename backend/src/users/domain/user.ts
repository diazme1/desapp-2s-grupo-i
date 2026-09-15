export interface CreateUserInput {
  id?: string;
  correo: string;
  passwordHash: string;
  creadoEn?: Date;
}

export class User {
  readonly id: string;
  readonly correo: string;
  readonly passwordHash: string;
  readonly creadoEn: Date;

  private constructor(input: Required<CreateUserInput>) {
    this.id = input.id;
    this.correo = input.correo;
    this.passwordHash = input.passwordHash;
    this.creadoEn = input.creadoEn;
  }

  static create(input: CreateUserInput): User {
    const correo = input.correo.trim().toLowerCase();
    if (!correo || !correo.includes('@')) throw new Error('El correo es obligatorio.');
    if (!input.passwordHash) throw new Error('La contraseña debe estar protegida.');
    return new User({
      id: input.id ?? randomUUID(),
      correo,
      passwordHash: input.passwordHash,
      creadoEn: input.creadoEn ?? new Date(),
    });
  }
}
import { randomUUID } from 'node:crypto';
