import { Column, JoinColumn, ManyToOne } from 'typeorm';
import { JugadorEntity } from '../../players/persistence/jugador.entity';
import { UserEntity } from '../../users/persistence/user.entity';
import type { TipoTransaccionMercado } from '../domain/transaccion-mercado';

const bigintTransformer = {
  to(value: bigint | string): string {
    return typeof value === 'bigint' ? value.toString() : value;
  },
  from(value: string | number): bigint {
    return BigInt(value);
  },
};

const numericTransformer = {
  to(value: string): string {
    return value;
  },
  from(value: string | number): string {
    return String(value);
  },
};

export abstract class TransaccionMercadoRegistroEntity {
  @Column({ name: 'tipo', type: 'varchar', length: 10 })
  tipo!: TipoTransaccionMercado;

  @Column({ name: 'id_usuario_comprador', type: 'uuid' })
  compradorId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_comprador' })
  comprador!: UserEntity;

  @Column({ name: 'id_usuario_vendedor', type: 'uuid' })
  vendedorId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_vendedor' })
  vendedor!: UserEntity;

  @Column({ name: 'id_jugador', type: 'uuid' })
  jugadorId!: string;

  @ManyToOne(() => JugadorEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_jugador' })
  jugador!: JugadorEntity;

  @Column({ name: 'cantidad_tokens', type: 'integer' })
  cantidadTokens!: number;

  @Column({
    name: 'cotizacion',
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: numericTransformer,
  })
  cotizacion!: string;

  @Column({
    name: 'importe_creditos',
    type: 'bigint',
    transformer: bigintTransformer,
  })
  importeCreditos!: bigint;

  @Column({ name: 'tipo_estrategia', type: 'varchar', length: 60 })
  tipoEstrategia!: string;

  @Column({ name: 'id_version_estrategia', type: 'uuid' })
  idVersionEstrategia!: string;

  @Column({ name: 'id_recalculo', type: 'uuid' })
  idRecalculo!: string;

  @Column({ name: 'fecha_hora', type: 'timestamptz' })
  fechaHora!: Date;

  @Column({ name: 'clave_idempotencia', type: 'varchar', length: 128 })
  claveIdempotencia!: string;
}
