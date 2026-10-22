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

const numericTransformer = {
  to(value: number): number {
    return value;
  },
  from(value: string | number): number {
    return Number(value);
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
  cotizacion!: number;

  @Column({ name: 'tipo_estrategia', type: 'varchar', length: 60 })
  tipoEstrategia!: string;

  @Column({ name: 'id_version_estrategia', type: 'uuid' })
  idVersionEstrategia!: string;

  @Column({ name: 'id_recalculo', type: 'uuid' })
  idRecalculo!: string;

  @ManyToOne(() => EstadisticasJugadorEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_estadistica' })
  estadistica!: EstadisticasJugadorEntity;
}
