import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EquipoEntity } from './equipo.entity';

@Entity({ name: 'jugadores' })
export class JugadorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'proveedor_id', type: 'integer', unique: true })
  proveedorId!: number;

  @Column({ name: 'nombre', length: 150 })
  nombre!: string;

  @Column({ name: 'nombre_completo', type: 'varchar', length: 200, nullable: true })
  nombreCompleto!: string | null;

  @Column({ name: 'posicion', type: 'varchar', length: 80, nullable: true })
  posicion!: string | null;

  @Column({ name: 'fecha_nacimiento', type: 'date', nullable: true })
  fechaNacimiento!: string | null;

  @Column({ name: 'nacionalidad', type: 'varchar', length: 100, nullable: true })
  nacionalidad!: string | null;

  @ManyToOne(() => EquipoEntity, (equipo) => equipo.jugadores, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'equipo_id' })
  equipo!: EquipoEntity;

  @Column({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
