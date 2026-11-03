import { Column, Entity, PrimaryColumn } from 'typeorm';
import { UserRole } from '../domain/user';

@Entity({ name: 'usuarios' })
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'correo', length: 254, unique: true })
  correo!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ name: 'rol', type: 'varchar', length: 20, default: UserRole.USER })
  rol!: UserRole;

  @Column({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;
}
