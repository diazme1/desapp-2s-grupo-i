import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { EquipoEntity } from './equipo.entity';
import { IdentidadExternaJugadorEntity } from './identidad-externa-jugador.entity';
import { LigaEntity } from './liga.entity';

@Entity({ name: 'jugadores' })
@Index('idx_jugadores_activo', ['activo'])
@Index('idx_jugadores_posicion', ['posicion'])
export class JugadorEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'nombre', length: 200 })
  nombre!: string;

  @Column({ name: 'posicion', length: 100 })
  posicion!: string;

  @Column({ name: 'activo', default: true })
  activo!: boolean;

  @Column({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;

  @ManyToOne(() => LigaEntity, (liga) => liga.jugadores, { nullable: false })
  @JoinColumn({ name: 'liga_id' })
  liga!: LigaEntity;

  @ManyToOne(() => EquipoEntity, (equipo) => equipo.jugadores, { nullable: false })
  @JoinColumn({ name: 'equipo_id' })
  equipo!: EquipoEntity;

  @OneToMany(() => IdentidadExternaJugadorEntity, (identidad) => identidad.jugador)
  identidadesExternas!: IdentidadExternaJugadorEntity[];
}
