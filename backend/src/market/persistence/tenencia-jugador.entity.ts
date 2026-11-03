import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JugadorEntity } from '../../players/persistence/jugador.entity';
import { UserEntity } from '../../users/persistence/user.entity';

@Entity({ name: 'tenencias_jugador' })
@Index('uq_tenencias_usuario_jugador', ['usuarioId', 'jugadorId'], { unique: true })
export class TenenciaJugadorEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_tenencia' })
  id!: string;

  @Column({ name: 'id_usuario', type: 'uuid' })
  usuarioId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: UserEntity;

  @Column({ name: 'id_jugador', type: 'uuid' })
  jugadorId!: string;

  @ManyToOne(() => JugadorEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_jugador' })
  jugador!: JugadorEntity;

  @Column({ name: 'cantidad_tokens', type: 'integer' })
  cantidadTokens!: number;

  @Column({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
