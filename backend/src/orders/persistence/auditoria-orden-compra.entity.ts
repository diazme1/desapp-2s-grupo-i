import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrdenCompraEntity } from './orden-compra.entity';
import { OrdenCompraRegistroEntity } from './orden-compra-registro.entity';

@Entity({ name: 'auditorias_orden_compra' })
@Index('uq_auditorias_orden_compra_operacion', ['idOperacion'], { unique: true })
@Index('idx_auditorias_orden_compra_fecha', ['fechaHora'])
export class AuditoriaOrdenCompraEntity extends OrdenCompraRegistroEntity {
  @PrimaryColumn({ name: 'id_auditoria', type: 'uuid' })
  idAuditoria!: string;

  @Column({ name: 'id_operacion', type: 'uuid' })
  idOperacion!: string;

  @ManyToOne(() => OrdenCompraEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_operacion' })
  operacion!: OrdenCompraEntity;

}
