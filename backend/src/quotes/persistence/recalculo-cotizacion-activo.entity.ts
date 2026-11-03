import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'recalculo_cotizacion_activo' })
export class RecalculoCotizacionActivoEntity {
  @PrimaryColumn({ type: 'smallint' })
  id!: number;

  @Column({ name: 'id_recalculo', type: 'uuid', nullable: true })
  idRecalculo!: string | null;

  @Column({ name: 'tipo_estrategia', type: 'varchar', length: 60, nullable: true })
  tipoEstrategia!: string | null;

  @Column({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
