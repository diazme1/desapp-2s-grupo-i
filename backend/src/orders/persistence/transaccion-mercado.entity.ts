import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { TransaccionMercadoRegistroEntity } from './transaccion-mercado-registro.entity';

@Entity({ name: 'transacciones_mercado' })
@Index('uq_transacciones_mercado_clave_idempotencia', ['claveIdempotencia'], {
  unique: true,
})
@Index('idx_transacciones_mercado_jugador_fecha', ['jugadorId', 'fechaHora'])
@Index('idx_transacciones_mercado_comprador_fecha', [
  'compradorId',
  'fechaHora',
])
@Index('idx_transacciones_mercado_vendedor_fecha', ['vendedorId', 'fechaHora'])
export class TransaccionMercadoEntity extends TransaccionMercadoRegistroEntity {
  @PrimaryColumn({ name: 'id_operacion', type: 'uuid' })
  idOperacion!: string;

  @Column({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;
}
