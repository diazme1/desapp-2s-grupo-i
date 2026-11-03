import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { JugadorEntity } from '../../players/persistence/jugador.entity';
import { UserEntity } from '../../users/persistence/user.entity';

@Entity({ name: 'tokens' })
@Index('uq_tokens_jugador_numero_emision', ['jugadorId', 'numeroEmision'], { unique: true })
@Index('idx_tokens_jugador_owner', ['jugadorId', 'usuarioOwnerId'])
export class TokenJugadorEntity {
  @PrimaryColumn({ name: 'id_token', type: 'uuid' })
  idToken!: string;

  @Column({ name: 'id_jugador', type: 'uuid' })
  jugadorId!: string;

  @ManyToOne(() => JugadorEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_jugador' })
  jugador!: JugadorEntity;

  @Column({ name: 'id_usuario_owner', type: 'uuid' })
  usuarioOwnerId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_owner' })
  usuarioOwner!: UserEntity;

  @Column({ name: 'numero_emision', type: 'smallint' })
  numeroEmision!: number;

  @Column({ name: 'id_lote_emision', type: 'uuid' })
  loteEmisionId!: string;

  @Column({ name: 'emitido_en', type: 'timestamptz' })
  emitidoEn!: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
