import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JugadorEntity } from './jugador.entity';
import { EstadisticasJugadorEntity } from './estadisticas-jugador.entity';
import { Cotizacion } from '../../market/domain/cotizacion';

const numericTransformer = {
  to(value: Cotizacion | string | number): string {
    if (value instanceof Cotizacion) return value.toDecimalString();
    return Cotizacion.fromDecimal(String(value)).toDecimalString();
  },
  from(value: string | number): Cotizacion {
    return Cotizacion.fromDecimal(String(value));
  },
};

@Entity({ name: 'historial_cotizacion' })
@Index('idx_historial_cotizacion_jugador_fecha_id', [
  'jugador',
  'fechaHora',
  'id',
])
export class HistorialCotizacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => JugadorEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_jugador' })
  jugador!: JugadorEntity;

  @Column({ name: 'fecha_hora', type: 'timestamptz' })
  fechaHora!: Date;

  @Column({
    name: 'cotizacion',
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: numericTransformer,
  })
  // `number` is retained only as an input compatibility type for existing
  // fixtures that persist calculated historical rows. Reads are transformed to
  // the exact Cotizacion value object before entering the application layer.
  cotizacion!: Cotizacion | number;

  @Column({ name: 'tipo_estrategia', type: 'varchar', length: 60 })
  tipoEstrategia!: string;

  @Column({ name: 'id_version_estrategia', type: 'uuid' })
  idVersionEstrategia!: string;

  @Column({ name: 'id_recalculo', type: 'uuid', nullable: true })
  idRecalculo!: string | null;

  @ManyToOne(() => EstadisticasJugadorEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_estadistica' })
  estadistica!: EstadisticasJugadorEntity | null;
}
