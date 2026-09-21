import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { JugadorEntity } from './jugador.entity';

@Entity({ name: 'identidades_externas_jugador' })
export class IdentidadExternaJugadorEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proveedor', length: 100 })
  proveedor!: string;

  @Column({ name: 'external_id', length: 200 })
  externalId!: string;

  @ManyToOne(() => JugadorEntity, (jugador) => jugador.identidadesExternas, { nullable: false })
  @JoinColumn({ name: 'jugador_id' })
  jugador!: JugadorEntity;
}
