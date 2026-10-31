import { randomUUID } from 'node:crypto';
import { Creditos } from '../../market/domain/creditos';
import { TenenciaJugador } from '../../market/domain/tenencia-jugador';
import { TokenJugador } from '../../market/domain/token-jugador';
import { Jugador } from '../../players/domain/jugador';
import type {
  ActiveQuoteSnapshot,
  ExistingBuyOrder,
} from '../orders.repository';
import { User, UserRole } from '../../users/domain/user';
import { SaldoUsuario } from '../../users/domain/saldo-usuario';
import {
  calcularImporte,
  exigirCotizacion,
  exigirJugador,
  OrdenMercadoDomainError as OrdenCompraDomainError,
  prepararTransferencia,
  validarCantidad,
  validarIdempotencia,
  validarPartesDistintas,
} from './orden-mercado-reglas';
export { OrdenMercadoDomainError as OrdenCompraDomainError } from './orden-mercado-reglas';
export type { OrdenMercadoErrorCode as OrdenCompraErrorCode } from './orden-mercado-reglas';
import type {
  AuditoriaTransaccionSnapshot,
  TransaccionMercadoSnapshot,
} from './transaccion-mercado';

export interface OrdenCompraSnapshot extends Omit<
  TransaccionMercadoSnapshot,
  'tipo'
> {
  tipo: 'COMPRA';
}
export interface AuditoriaOrdenCompraSnapshot extends Omit<
  AuditoriaTransaccionSnapshot,
  'tipo'
> {
  idAuditoria: string;
  tipo: 'COMPRA';
}
export interface EjecutarOrdenCompraInput {
  claveIdempotencia: string;
  cantidadTokens: number;
  comprador: User | null;
  vendedor: User | null;
  jugador: Jugador | null;
  quote: ActiveQuoteSnapshot | null;
  saldoComprador: SaldoUsuario | null;
  saldoVendedor: SaldoUsuario | null;
  tokensJugador: TokenJugador[];
  tenenciaComprador: TenenciaJugador | null;
  tenenciaVendedor: TenenciaJugador | null;
  ordenExistente: ExistingBuyOrder | null;
  ahora?: Date;
}

export interface BuyOrderResult {
  readonly tipo: 'confirmada' | 'replay';
  readonly orden: OrdenCompraSnapshot;
  readonly auditoria: AuditoriaOrdenCompraSnapshot | null;
  readonly tokensTransferidos: readonly TokenJugador[];
  readonly saldoComprador: SaldoUsuario | null;
  readonly saldoVendedor: SaldoUsuario | null;
  readonly tenenciaComprador: TenenciaJugador | null;
  readonly tenenciaVendedor: TenenciaJugador | null;
}

export class OrdenCompra {
  private constructor(private readonly snapshotInterno: OrdenCompraSnapshot) {}

  static ejecutar(input: EjecutarOrdenCompraInput): BuyOrderResult {
    const comprador = exigirComprador(input.comprador);
    const vendedor = exigirVendedor(input.vendedor);
    validarPartesDistintas(comprador, vendedor);
    const existente = input.ordenExistente;
    if (existente) return resolverIdempotencia(input, existente);

    const jugador = exigirJugador(input.jugador);
    const quote = exigirCotizacion(input.quote);
    validarCantidad(input.cantidadTokens);

    const importe = calcularImporte(quote, input.cantidadTokens);

    const saldoComprador = input.saldoComprador;
    if (!saldoComprador || saldoComprador.usuarioId !== comprador.id)
      throw new OrdenCompraDomainError(
        'COMPRADOR_INVALIDO',
        'El saldo del comprador no es válido.',
      );
    if (!saldoComprador.tieneCreditosSuficientes(importe))
      throw new OrdenCompraDomainError(
        'SALDO_INSUFICIENTE',
        'El saldo del comprador es insuficiente.',
      );

    const { tokensActualizados, tenenciaVendedor, tenenciaComprador } =
      prepararTransferencia({
        tokensJugador: input.tokensJugador,
        jugadorId: jugador.id,
        vendedor,
        comprador,
        cantidadTokens: input.cantidadTokens,
        tenenciaVendedor: input.tenenciaVendedor,
        tenenciaComprador: input.tenenciaComprador,
        mensajeTokensInsuficientes:
          'El vendedor no dispone de suficientes tokens.',
      });
    if (input.saldoVendedor && input.saldoVendedor.usuarioId !== vendedor.id)
      throw new OrdenCompraDomainError(
        'VENDEDOR_INVALIDO',
        'El saldo del vendedor no es válido.',
      );
    const saldoVendedor = (
      input.saldoVendedor ??
      SaldoUsuario.crear({
        usuarioId: vendedor.id,
        rol: vendedor.rol,
        creditosDisponibles: Creditos.fromUnidades(0n),
      })
    ).acreditar(importe);
    const saldoCompradorActualizado = saldoComprador.debitar(importe);
    const ahora = input.ahora ?? new Date();
    const orden = new OrdenCompra({
      idOperacion: randomUUID(),
      tipo: 'COMPRA',
      claveIdempotencia: input.claveIdempotencia,
      compradorId: comprador.id,
      vendedorId: vendedor.id,
      jugadorId: jugador.id,
      cantidadTokens: input.cantidadTokens,
      cotizacion: quote.cotizacion,
      importeCreditos: importe.toUnidades(),
      estrategia: quote.estrategia,
      idVersionEstrategia: quote.idVersionEstrategia,
      idRecalculo: quote.idRecalculo,
      fechaHora: ahora,
    });
    const snapshot = orden.snapshot();
    return Object.freeze({
      tipo: 'confirmada',
      orden: snapshot,
      auditoria: Object.freeze({
        ...snapshot,
        idAuditoria: randomUUID(),
      }),
      tokensTransferidos: Object.freeze(tokensActualizados),
      saldoComprador: saldoCompradorActualizado,
      saldoVendedor,
      tenenciaComprador,
      tenenciaVendedor,
    });
  }

  snapshot(): OrdenCompraSnapshot {
    return Object.freeze({ ...this.snapshotInterno });
  }
}

function resolverIdempotencia(
  input: EjecutarOrdenCompraInput,
  existente: ExistingBuyOrder,
): BuyOrderResult {
  validarIdempotencia(existente, {
    tipo: 'COMPRA',
    claveIdempotencia: input.claveIdempotencia,
    compradorId: input.comprador?.id,
    vendedorId: input.vendedor?.id,
    jugadorId: input.jugador?.id,
    cantidadTokens: input.cantidadTokens,
  });
  const snapshot: OrdenCompraSnapshot = Object.freeze({
    ...existente,
    tipo: 'COMPRA',
  });
  return Object.freeze({
    tipo: 'replay',
    orden: snapshot,
    auditoria: null,
    tokensTransferidos: Object.freeze([]),
    saldoComprador: null,
    saldoVendedor: null,
    tenenciaComprador: null,
    tenenciaVendedor: null,
  });
}

function exigirComprador(comprador: User | null): User {
  if (!comprador || comprador.rol !== UserRole.USER)
    throw new OrdenCompraDomainError(
      'COMPRADOR_INVALIDO',
      'El comprador debe ser un usuario común.',
    );
  return comprador;
}

function exigirVendedor(vendedor: User | null): User {
  if (!vendedor || vendedor.rol !== UserRole.SUPERADMIN)
    throw new OrdenCompraDomainError(
      'VENDEDOR_INVALIDO',
      'El vendedor debe ser el superadmin.',
    );
  return vendedor;
}
