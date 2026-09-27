import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { JugadorEntity } from './jugador.entity';
import { LigaEntity } from './liga.entity';

@Entity({ name: 'equipos' })
export class EquipoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'proveedor_id', type: 'integer', unique: true })
  proveedorId!: number;

  @Column({ name: 'nombre', length: 150 })
  nombre!: string;

  @Column({ name: 'nombre_corto', type: 'varchar', length: 100, nullable: true })
  nombreCorto!: string | null;

  @Column({ name: 'sigla', type: 'varchar', length: 10, nullable: true })
  sigla!: string | null;

  @Column({ name: 'escudo_url', type: 'text', nullable: true })
  escudoUrl!: string | null;

  @ManyToOne(() => LigaEntity, (liga) => liga.equipos, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'liga_id' })
  liga!: LigaEntity;

  @Column({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;

  @OneToMany(() => JugadorEntity, (jugador) => jugador.equipo)
  jugadores!: JugadorEntity[];
}
