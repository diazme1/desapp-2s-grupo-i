import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { VersionEstrategiaCotizacionEntity } from './version-estrategia-cotizacion.entity';

@Entity({ name: 'recalculos_cotizacion' })
export class RecalculoCotizacionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @ManyToOne(() => VersionEstrategiaCotizacionEntity, { nullable: false })
  @JoinColumn({ name: 'id_version_estrategia' })
  versionEstrategia!: VersionEstrategiaCotizacionEntity;

  @Column({ name: 'fecha_inicio', type: 'timestamptz' })
  fechaInicio!: Date;

  @Column({ name: 'fecha_fin', type: 'timestamptz' })
  fechaFin!: Date;

  @Column({ name: 'jugadores_cotizados', type: 'integer' })
  jugadoresCotizados!: number;
}
