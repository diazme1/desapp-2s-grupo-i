import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EquipoEntity } from './equipo.entity';

@Entity({ name: 'ligas' })
export class LigaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'proveedor_id', type: 'integer', unique: true })
  proveedorId!: number;

  @Column({ name: 'codigo', length: 20, unique: true })
  codigo!: string;

  @Column({ name: 'nombre', length: 150 })
  nombre!: string;

  @Column({ name: 'pais', type: 'varchar', length: 100, nullable: true })
  pais!: string | null;

  @Column({ name: 'emblema_url', type: 'text', nullable: true })
  emblemaUrl!: string | null;

  @Column({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;

  @OneToMany(() => EquipoEntity, (equipo) => equipo.liga)
  equipos!: EquipoEntity[];
}
