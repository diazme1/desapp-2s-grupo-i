import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique } from 'typeorm';
import type {
  PesosEstrategiaCotizacion,
  TipoEstrategiaCotizacion,
} from '../domain/estrategia-cotizacion';

@Entity({ name: 'versiones_estrategia_cotizacion' })
@Unique('uq_versiones_estrategia_cotizacion_tipo_version', [
  'tipoEstrategia',
  'numeroVersion',
])
export class VersionEstrategiaCotizacionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tipo_estrategia', type: 'varchar', length: 40 })
  tipoEstrategia!: TipoEstrategiaCotizacion;

  @Column({ name: 'numero_version', type: 'integer' })
  numeroVersion!: number;

  @Column({ name: 'pesos', type: 'jsonb' })
  pesos!: PesosEstrategiaCotizacion;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;
}
