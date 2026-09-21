import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { LigaEntity } from './liga.entity';
import { JugadorEntity } from './jugador.entity';

@Entity({ name: 'equipos' })
@Index('ux_equipos_liga_nombre', ['liga', 'nombre'], { unique: true })
export class EquipoEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'nombre', length: 150 })
  nombre!: string;

  @ManyToOne(() => LigaEntity, (liga) => liga.equipos, { nullable: false })
  @JoinColumn({ name: 'liga_id' })
  liga!: LigaEntity;

  @OneToMany(() => JugadorEntity, (jugador) => jugador.equipo)
  jugadores!: JugadorEntity[];
}
