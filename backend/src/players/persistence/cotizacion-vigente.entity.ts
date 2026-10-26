import { Column, Entity, PrimaryColumn } from 'typeorm';

const numericTransformer = {
  to(value: number): number {
    return value;
  },
  from(value: string | number): number {
    return Number(value);
  },
};

@Entity({ name: 'cotizacion_vigente' })
export class CotizacionVigenteEntity {
  @PrimaryColumn({ name: 'id_jugador', type: 'uuid' })
  idJugador!: string;

  @PrimaryColumn({ name: 'tipo_estrategia', type: 'varchar', length: 60 })
  tipoEstrategia!: string;

  @Column({
    name: 'cotizacion',
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: numericTransformer,
  })
  cotizacion!: number;

  @Column({ name: 'fecha_hora', type: 'timestamptz' })
  fechaHora!: Date;

  @Column({ name: 'id_version_estrategia', type: 'uuid' })
  idVersionEstrategia!: string;

  @Column({ name: 'id_recalculo', type: 'uuid' })
  idRecalculo!: string;

  @Column({ name: 'id_estadistica', type: 'uuid' })
  idEstadistica!: string;
}
