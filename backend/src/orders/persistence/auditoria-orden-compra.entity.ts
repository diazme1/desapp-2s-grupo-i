import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { JugadorEntity } from '../../players/persistence/jugador.entity';
import { UserEntity } from '../../users/persistence/user.entity';
import { OrdenCompraEntity } from './orden-compra.entity';

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

@Entity({ name: 'auditorias_orden_compra' })
@Index('uq_auditorias_orden_compra_operacion', ['idOperacion'], { unique: true })
@Index('idx_auditorias_orden_compra_fecha', ['fechaHora'])
export class AuditoriaOrdenCompraEntity {
  @PrimaryColumn({ name: 'id_auditoria', type: 'uuid' })
  idAuditoria!: string;

  @Column({ name: 'id_operacion', type: 'uuid' })
  idOperacion!: string;

  @ManyToOne(() => OrdenCompraEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_operacion' })
  operacion!: OrdenCompraEntity;

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

  @Column({ name: 'importe_creditos', type: 'bigint', transformer: bigintTransformer })
  importeCreditos!: bigint;

  @Column({ name: 'tipo_estrategia', type: 'varchar', length: 60 })
  tipoEstrategia!: string;

  @Column({ name: 'id_version_estrategia', type: 'uuid' })
  idVersionEstrategia!: string;

  @Column({ name: 'fecha_hora', type: 'timestamptz' })
  fechaHora!: Date;

  @Column({ name: 'clave_idempotencia', type: 'varchar', length: 128 })
  claveIdempotencia!: string;
}
