import { randomUUID } from 'node:crypto';

export interface CreateUserInput {
  id?: string;
  correo: string;
  passwordHash: string;
  rol?: UserRole;
  creadoEn?: Date;
}

export const UserRole = {
  USER: 'usuario',
  SUPERADMIN: 'superadmin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export class User {
  readonly id: string;
  readonly correo: string;
  readonly passwordHash: string;
  readonly rol: UserRole;
  readonly creadoEn: Date;

  private constructor(input: Required<CreateUserInput>) {
    this.id = input.id;
    this.correo = input.correo;
    this.passwordHash = input.passwordHash;
    this.rol = input.rol;
    this.creadoEn = input.creadoEn;
  }

  static create(input: CreateUserInput): User {
    const correo = input.correo.trim().toLowerCase();
    if (!correo || !correo.includes('@'))
      throw new Error('El correo es obligatorio.');
    if (!input.passwordHash)
      throw new Error('La contraseña debe estar protegida.');
    return new User({
      id: input.id ?? randomUUID(),
      correo,
      passwordHash: input.passwordHash,
      rol: input.rol ?? UserRole.USER,
      creadoEn: input.creadoEn ?? new Date(),
    });
  }
}
