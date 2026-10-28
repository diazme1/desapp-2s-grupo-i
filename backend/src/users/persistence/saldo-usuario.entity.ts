import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';

const bigintTransformer = {
  to(value: bigint | string): string {
    return typeof value === 'bigint' ? value.toString() : value;
  },
  from(value: string | number): bigint {
    return BigInt(value);
  },
};

@Entity({ name: 'saldos_usuario' })
export class SaldoUsuarioEntity {
  @PrimaryColumn({ name: 'id_usuario', type: 'uuid' })
  usuarioId!: string;

  @OneToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: UserEntity;

  @Column({
    name: 'creditos_disponibles',
    type: 'bigint',
    transformer: bigintTransformer,
  })
  creditosDisponibles!: bigint;

  @Column({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
