import { randomUUID } from 'node:crypto';
import { Cotizacion } from '../../market/domain/cotizacion';
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

export type OrdenVentaErrorCode =
  | 'VENDEDOR_INVALIDO'
  | 'COMPRADOR_INVALIDO'
  | 'PARTES_IGUALES'
  | 'JUGADOR_INVALIDO'
  | 'CANTIDAD_INVALIDA'
  | 'COTIZACION_INVALIDA'
  | 'IMPORTE_INVALIDO'
  | 'SALDO_INSUFICIENTE'
  | 'TOKENS_INSUFICIENTES'
  | 'TENENCIAS_INCONSISTENTES'
  | 'IDEMPOTENCIA_CONFLICTIVA';

export class OrdenVentaDomainError extends Error {
  constructor(
    readonly code: OrdenVentaErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OrdenVentaDomainError';
  }
}

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
    if (comprador.id === vendedor.id)
      throw new OrdenVentaDomainError(
        'PARTES_IGUALES',
        'El comprador no puede ser el vendedor.',
      );
    if (input.ordenExistente)
      return resolverIdempotencia(input, input.ordenExistente);

    const jugador = exigirJugador(input.jugador);
    const quote = exigirCotizacion(input.quote);
    validarCantidad(input.cantidadTokens);

    const importe = Creditos.fromUnidades(
      quote.cotizacion.toUnidades() * BigInt(input.cantidadTokens),
    );
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
    if (importe.toUnidades() < 0n)
      throw new OrdenVentaDomainError(
        'IMPORTE_INVALIDO',
        'El importe calculado no es válido.',
      );

    const tokens = input.tokensJugador
      .filter((token) => token.jugadorId === jugador.id)
      .sort((a, b) => a.numeroEmision - b.numeroEmision);
    const porPropietario = contarTokens(tokens);
    const tokensVendedor = tokens.filter(
      (token) => token.usuarioOwnerId === vendedor.id,
    );
    if (tokensVendedor.length < input.cantidadTokens)
      throw new OrdenVentaDomainError(
        'TOKENS_INSUFICIENTES',
        'El usuario no dispone de suficientes tokens.',
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
    const tenenciaComprador = (
      input.tenenciaComprador ??
      TenenciaJugador.crear({
        usuarioId: comprador.id,
        jugadorId: jugador.id,
        cantidadTokens: 0,
      })
    ).sumar(input.cantidadTokens);

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
  const coincide =
    existente.tipo === 'VENTA' &&
    existente.claveIdempotencia === input.claveIdempotencia &&
    existente.vendedorId === input.vendedor?.id &&
    existente.compradorId === input.comprador?.id &&
    existente.jugadorId === input.jugador?.id &&
    existente.cantidadTokens === input.cantidadTokens;
  if (!coincide)
    throw new OrdenVentaDomainError(
      'IDEMPOTENCIA_CONFLICTIVA',
      'La clave de idempotencia ya fue utilizada con otro contenido.',
    );
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

function exigirJugador(jugador: Jugador | null): Jugador {
  if (!jugador)
    throw new OrdenVentaDomainError(
      'JUGADOR_INVALIDO',
      'El jugador no existe.',
    );
  return jugador;
}

function exigirCotizacion(
  quote: ActiveQuoteSnapshot | null,
): ActiveQuoteSnapshot {
  if (
    !quote ||
    !quote.estrategia ||
    !quote.idVersionEstrategia ||
    !quote.idRecalculo ||
    !(quote.cotizacion instanceof Cotizacion)
  )
    throw new OrdenVentaDomainError(
      'COTIZACION_INVALIDA',
      'No existe una cotización vigente aplicable.',
    );
  return quote;
}

function validarCantidad(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad <= 0)
    throw new OrdenVentaDomainError(
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
    throw new OrdenVentaDomainError(
      'TENENCIAS_INCONSISTENTES',
      'Las tenencias no coinciden con los tokens individuales.',
    );
}

function exigirTenencia(tenencia: TenenciaJugador | null): TenenciaJugador {
  if (!tenencia)
    throw new OrdenVentaDomainError(
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
