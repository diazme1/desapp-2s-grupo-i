import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { OrdenCompraRegistroEntity } from './orden-compra-registro.entity';

@Entity({ name: 'ordenes_compra' })
@Index('uq_ordenes_compra_clave_idempotencia', ['claveIdempotencia'], { unique: true })
@Index('idx_ordenes_compra_jugador_fecha', ['jugadorId', 'fechaHora'])
@Index('idx_ordenes_compra_comprador_fecha', ['compradorId', 'fechaHora'])
export class OrdenCompraEntity extends OrdenCompraRegistroEntity {
  @PrimaryColumn({ name: 'id_operacion', type: 'uuid' })
  idOperacion!: string;

  @Column({ name: 'id_recalculo', type: 'uuid' })
  idRecalculo!: string;

  @Column({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;
}
