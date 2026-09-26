import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { JugadorEntity } from './jugador.entity';

@Entity({ name: 'estadisticas_jugadores' })
@Index('idx_estadisticas_jugadores_id_jugador', ['jugador'])
export class EstadisticasJugadorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => JugadorEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_jugador' })
  jugador!: JugadorEntity;

  @Column({ name: 'goles', type: 'integer', nullable: true })
  goles!: number | null;

  @Column({ name: 'asistencias', type: 'integer', nullable: true })
  asistencias!: number | null;

  @Column({ name: 'tiros', type: 'double precision', nullable: true })
  tiros!: number | null;

  @Column({ name: 'pases_clave', type: 'double precision', nullable: true })
  pasesClave!: number | null;

  @Column({ name: 'regates', type: 'double precision', nullable: true })
  regates!: number | null;

  @Column({ name: 'faltas_cometidas', type: 'double precision', nullable: true })
  faltasCometidas!: number | null;

  @Column({ name: 'rating_whoscored', type: 'double precision', nullable: true })
  ratingWhoScored!: number | null;
}
