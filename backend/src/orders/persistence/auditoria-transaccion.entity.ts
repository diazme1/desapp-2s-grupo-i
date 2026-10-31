import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { TransaccionMercadoRegistroEntity } from './transaccion-mercado-registro.entity';
import { TransaccionMercadoEntity } from './transaccion-mercado.entity';

@Entity({ name: 'auditorias_transaccion' })
@Index('uq_auditorias_transaccion_operacion', ['idOperacion'], { unique: true })
@Index('idx_auditorias_transaccion_fecha', ['fechaHora'])
export class AuditoriaTransaccionEntity extends TransaccionMercadoRegistroEntity {
  @PrimaryColumn({ name: 'id_auditoria', type: 'uuid' })
  idAuditoria!: string;

  @Column({ name: 'id_operacion', type: 'uuid' })
  idOperacion!: string;

  @ManyToOne(() => TransaccionMercadoEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_operacion' })
  operacion!: TransaccionMercadoEntity;
}
