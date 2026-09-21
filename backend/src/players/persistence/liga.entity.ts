import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { EquipoEntity } from './equipo.entity';
import { JugadorEntity } from './jugador.entity';

@Entity({ name: 'ligas' })
export class LigaEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'codigo', length: 100, unique: true })
  codigo!: string;

  @Column({ name: 'nombre', length: 100, unique: true })
  nombre!: string;

  @OneToMany(() => EquipoEntity, (equipo) => equipo.liga)
  equipos!: EquipoEntity[];

  @OneToMany(() => JugadorEntity, (jugador) => jugador.liga)
  jugadores!: JugadorEntity[];
}
