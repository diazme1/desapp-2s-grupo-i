import { randomUUID } from 'node:crypto';
import { Cotizacion } from '../../market/domain/cotizacion';
import { Creditos } from '../../market/domain/creditos';
import { TenenciaJugador } from '../../market/domain/tenencia-jugador';
import { TokenJugador } from '../../market/domain/token-jugador';
import { Jugador } from '../../players/domain/jugador';
import type { ActiveQuoteSnapshot, ExistingBuyOrder } from '../orders.repository';
import { User, UserRole } from '../../users/domain/user';
import { SaldoUsuario } from '../../users/domain/saldo-usuario';
import type {
  AuditoriaTransaccionSnapshot,
  TransaccionMercadoSnapshot,
} from './transaccion-mercado';

export type OrdenCompraErrorCode =
  | 'COMPRADOR_INVALIDO'
  | 'VENDEDOR_INVALIDO'
  | 'PARTES_IGUALES'
  | 'JUGADOR_INVALIDO'
  | 'CANTIDAD_INVALIDA'
  | 'COTIZACION_INVALIDA'
  | 'IMPORTE_INVALIDO'
  | 'SALDO_INSUFICIENTE'
  | 'TOKENS_INSUFICIENTES'
  | 'TENENCIAS_INCONSISTENTES'
  | 'IDEMPOTENCIA_CONFLICTIVA';

export class OrdenCompraDomainError extends Error {
  constructor(
    readonly code: OrdenCompraErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OrdenCompraDomainError';
  }
}

export interface OrdenCompraSnapshot
  extends Omit<TransaccionMercadoSnapshot, 'tipo'> {
  tipo: 'COMPRA';
}

export interface AuditoriaOrdenCompraSnapshot
  extends Omit<AuditoriaTransaccionSnapshot, 'tipo'> {
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
    if (comprador.id === vendedor.id)
      throw new OrdenCompraDomainError(
        'PARTES_IGUALES',
        'El comprador no puede ser el vendedor.',
      );
    const existente = input.ordenExistente;
    if (existente) return resolverIdempotencia(input, existente);

    const jugador = exigirJugador(input.jugador);
    const quote = exigirCotizacion(input.quote);
    validarCantidad(input.cantidadTokens);

    const importe = Creditos.fromUnidades(
      quote.cotizacion.toUnidades() * BigInt(input.cantidadTokens),
    );
    if (importe.toUnidades() < 0n)
      throw new OrdenCompraDomainError(
        'IMPORTE_INVALIDO',
        'El importe calculado no es válido.',
      );

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

    const tokens = input.tokensJugador
      .filter((token) => token.jugadorId === jugador.id)
      .sort((a, b) => a.numeroEmision - b.numeroEmision);
    const porPropietario = contarTokens(tokens);
    const tokensVendedor = tokens.filter(
      (token) => token.usuarioOwnerId === vendedor.id,
    );
    if (tokensVendedor.length < input.cantidadTokens)
      throw new OrdenCompraDomainError(
        'TOKENS_INSUFICIENTES',
        'El vendedor no dispone de suficientes tokens.',
      );
    validarTenencia(
      input.tenenciaVendedor,
      vendedor.id,
      jugador.id,
      porPropietario.get(vendedor.id) ?? 0,
    );
    validarTenencia(
      input.tenenciaComprador,
      comprador.id,
      jugador.id,
      porPropietario.get(comprador.id) ?? 0,
      true,
    );

    const transferidos = tokensVendedor.slice(0, input.cantidadTokens);
    const tokensActualizados = transferidos.map((token) =>
      token.transferirDesde(vendedor.id, comprador.id),
    );
    const tenenciaVendedor = exigirTenencia(input.tenenciaVendedor).restar(
      input.cantidadTokens,
    );
    const tenenciaComprador = (input.tenenciaComprador ??
      TenenciaJugador.crear({
        usuarioId: comprador.id,
        jugadorId: jugador.id,
        cantidadTokens: 0,
      })).sumar(input.cantidadTokens);
    if (input.saldoVendedor && input.saldoVendedor.usuarioId !== vendedor.id)
      throw new OrdenCompraDomainError(
        'VENDEDOR_INVALIDO',
        'El saldo del vendedor no es válido.',
      );
    const saldoVendedor = (input.saldoVendedor ??
      SaldoUsuario.crear({
        usuarioId: vendedor.id,
        rol: vendedor.rol,
        creditosDisponibles: Creditos.fromUnidades(0n),
      })).acreditar(importe);
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
  const coincide =
    existente.tipo === 'COMPRA' &&
    existente.claveIdempotencia === input.claveIdempotencia &&
    existente.compradorId === input.comprador?.id &&
    existente.jugadorId === input.jugador?.id &&
    existente.cantidadTokens === input.cantidadTokens;
  if (!coincide)
    throw new OrdenCompraDomainError(
      'IDEMPOTENCIA_CONFLICTIVA',
      'La clave de idempotencia ya fue utilizada con otro contenido.',
    );
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

function exigirJugador(jugador: Jugador | null): Jugador {
  if (!jugador)
    throw new OrdenCompraDomainError(
      'JUGADOR_INVALIDO',
      'El jugador no existe.',
    );
  return jugador;
}

function exigirCotizacion(quote: ActiveQuoteSnapshot | null): ActiveQuoteSnapshot {
  if (
    !quote ||
    !quote.estrategia ||
    !quote.idVersionEstrategia ||
    !quote.idRecalculo ||
    !(quote.cotizacion instanceof Cotizacion)
  )
    throw new OrdenCompraDomainError(
      'COTIZACION_INVALIDA',
      'No existe una cotización vigente aplicable.',
    );
  return quote;
}

function validarCantidad(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad <= 0)
    throw new OrdenCompraDomainError(
      'CANTIDAD_INVALIDA',
      'La cantidad de tokens debe ser positiva.',
    );
}

function validarTenencia(
  tenencia: TenenciaJugador | null,
  usuarioId: string,
  jugadorId: string,
  cantidadEsperada: number,
  permitirAusencia = false,
): void {
  if (!tenencia && permitirAusencia && cantidadEsperada === 0) return;
  if (
    !tenencia ||
    tenencia.usuarioId !== usuarioId ||
    tenencia.jugadorId !== jugadorId ||
    tenencia.cantidadTokens !== cantidadEsperada
  )
    throw new OrdenCompraDomainError(
      'TENENCIAS_INCONSISTENTES',
      'Las tenencias no coinciden con los tokens individuales.',
    );
}

function exigirTenencia(tenencia: TenenciaJugador | null): TenenciaJugador {
  if (!tenencia)
    throw new OrdenCompraDomainError(
      'TENENCIAS_INCONSISTENTES',
      'La tenencia del vendedor es obligatoria.',
    );
  return tenencia;
}

function contarTokens(tokens: TokenJugador[]): Map<string, number> {
  const cantidades = new Map<string, number>();
  for (const token of tokens)
    cantidades.set(
      token.usuarioOwnerId,
      (cantidades.get(token.usuarioOwnerId) ?? 0) + 1,
    );
  return cantidades;
}
