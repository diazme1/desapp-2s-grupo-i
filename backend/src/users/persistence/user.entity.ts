import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'usuarios' })
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'correo', length: 254, unique: true })
  correo!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;
}
