import { randomUUID } from 'node:crypto';
import { Creditos } from '../../market/domain/creditos';
import { TenenciaJugador } from '../../market/domain/tenencia-jugador';
import { TokenJugador } from '../../market/domain/token-jugador';
import { Jugador } from '../../players/domain/jugador';
import { SaldoUsuario } from '../../users/domain/saldo-usuario';
import { User, UserRole } from '../../users/domain/user';
import type {
  ActiveQuoteSnapshot,
  ExistingMarketTransaction,
} from '../orders.repository';
import type {
  AuditoriaTransaccionSnapshot,
  TransaccionMercadoSnapshot,
} from './transaccion-mercado';
import {
  calcularImporte,
  exigirCotizacion,
  exigirJugador,
  OrdenMercadoDomainError as OrdenVentaDomainError,
  prepararTransferencia,
  validarCantidad,
  validarIdempotencia,
  validarPartesDistintas,
} from './orden-mercado-reglas';
export { OrdenMercadoDomainError as OrdenVentaDomainError } from './orden-mercado-reglas';
export type { OrdenMercadoErrorCode as OrdenVentaErrorCode } from './orden-mercado-reglas';

export interface OrdenVentaSnapshot extends Omit<
  TransaccionMercadoSnapshot,
  'tipo'
> {
  tipo: 'VENTA';
}
export interface AuditoriaOrdenVentaSnapshot extends Omit<
  AuditoriaTransaccionSnapshot,
  'tipo'
> {
  idAuditoria: string;
  tipo: 'VENTA';
}
export interface EjecutarOrdenVentaInput {
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
  ordenExistente: ExistingMarketTransaction | null;
  ahora?: Date;
}

export interface SellOrderResult {
  readonly tipo: 'confirmada' | 'replay';
  readonly orden: OrdenVentaSnapshot;
  readonly auditoria: AuditoriaOrdenVentaSnapshot | null;
  readonly tokensTransferidos: readonly TokenJugador[];
  readonly saldoComprador: SaldoUsuario | null;
  readonly saldoVendedor: SaldoUsuario | null;
  readonly tenenciaComprador: TenenciaJugador | null;
  readonly tenenciaVendedor: TenenciaJugador | null;
}

export class OrdenVenta {
  private constructor(private readonly snapshotInterno: OrdenVentaSnapshot) {}

  static ejecutar(input: EjecutarOrdenVentaInput): SellOrderResult {
    const vendedor = exigirVendedor(input.vendedor);
    const comprador = exigirComprador(input.comprador);
    validarPartesDistintas(comprador, vendedor);
    if (input.ordenExistente)
      return resolverIdempotencia(input, input.ordenExistente);

    const jugador = exigirJugador(input.jugador);
    const quote = exigirCotizacion(input.quote);
    validarCantidad(input.cantidadTokens);

    const importe = calcularImporte(quote, input.cantidadTokens);
    const saldoVendedor = input.saldoVendedor;
    if (
      !saldoVendedor ||
      saldoVendedor.usuarioId !== vendedor.id ||
      saldoVendedor.rol !== UserRole.USER
    )
      throw new OrdenVentaDomainError(
        'VENDEDOR_INVALIDO',
        'El saldo del vendedor no es válido.',
      );
    if (!saldoVendedor.tieneCreditosSuficientes(Creditos.fromUnidades(0n)))
      throw new OrdenVentaDomainError(
        'SALDO_INSUFICIENTE',
        'El saldo del usuario común es insuficiente.',
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
          'El usuario no dispone de suficientes tokens.',
      });

    if (
      input.saldoComprador &&
      (input.saldoComprador.usuarioId !== comprador.id ||
        input.saldoComprador.rol !== UserRole.SUPERADMIN)
    )
      throw new OrdenVentaDomainError(
        'COMPRADOR_INVALIDO',
        'El saldo del comprador no es válido.',
      );
    const saldoComprador = (
      input.saldoComprador ??
      SaldoUsuario.crear({
        usuarioId: comprador.id,
        rol: UserRole.SUPERADMIN,
        creditosDisponibles: Creditos.fromUnidades(0n),
      })
    ).debitar(importe);
    const saldoVendedorActualizado = saldoVendedor.acreditar(importe);
    const ahora = input.ahora ?? new Date();
    const orden = new OrdenVenta({
      idOperacion: randomUUID(),
      tipo: 'VENTA',
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
      saldoComprador,
      saldoVendedor: saldoVendedorActualizado,
      tenenciaComprador,
      tenenciaVendedor,
    });
  }

  snapshot(): OrdenVentaSnapshot {
    return Object.freeze({ ...this.snapshotInterno });
  }
}

function resolverIdempotencia(
  input: EjecutarOrdenVentaInput,
  existente: ExistingMarketTransaction,
): SellOrderResult {
  validarIdempotencia(existente, {
    tipo: 'VENTA',
    claveIdempotencia: input.claveIdempotencia,
    compradorId: input.comprador?.id,
    vendedorId: input.vendedor?.id,
    jugadorId: input.jugador?.id,
    cantidadTokens: input.cantidadTokens,
  });
  const snapshot: OrdenVentaSnapshot = Object.freeze({
    ...existente,
    tipo: 'VENTA',
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

function exigirVendedor(vendedor: User | null): User {
  if (!vendedor || vendedor.rol !== UserRole.USER)
    throw new OrdenVentaDomainError(
      'VENDEDOR_INVALIDO',
      'El vendedor debe ser un usuario común.',
    );
  return vendedor;
}

function exigirComprador(comprador: User | null): User {
  if (!comprador || comprador.rol !== UserRole.SUPERADMIN)
    throw new OrdenVentaDomainError(
      'COMPRADOR_INVALIDO',
      'El comprador debe ser el superadmin.',
    );
  return comprador;
}
