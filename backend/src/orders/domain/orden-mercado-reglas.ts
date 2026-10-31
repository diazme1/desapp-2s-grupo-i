import { Cotizacion } from '../../market/domain/cotizacion';
import { Creditos } from '../../market/domain/creditos';
import { TenenciaJugador } from '../../market/domain/tenencia-jugador';
import { TokenJugador } from '../../market/domain/token-jugador';
import { Jugador } from '../../players/domain/jugador';
import { User } from '../../users/domain/user';
import type { ActiveQuoteSnapshot } from '../orders.repository';
import type {
  TipoTransaccionMercado,
  TransaccionMercadoSnapshot,
} from './transaccion-mercado';

export type OrdenMercadoErrorCode =
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

export class OrdenMercadoDomainError extends Error {
  constructor(
    readonly code: OrdenMercadoErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OrdenMercadoDomainError';
  }
}

export function exigirJugador(jugador: Jugador | null): Jugador {
  if (!jugador)
    throw new OrdenMercadoDomainError(
      'JUGADOR_INVALIDO',
      'El jugador no existe.',
    );
  return jugador;
}

export function exigirCotizacion(
  quote: ActiveQuoteSnapshot | null,
): ActiveQuoteSnapshot {
  if (
    !quote ||
    !quote.estrategia ||
    !quote.idVersionEstrategia ||
    !quote.idRecalculo ||
    !(quote.cotizacion instanceof Cotizacion)
  )
    throw new OrdenMercadoDomainError(
      'COTIZACION_INVALIDA',
      'No existe una cotización vigente aplicable.',
    );
  return quote;
}

export function calcularImporte(
  quote: ActiveQuoteSnapshot,
  cantidadTokens: number,
): Creditos {
  const importe = Creditos.fromUnidades(
    quote.cotizacion.toUnidades() * BigInt(cantidadTokens),
  );
  if (importe.toUnidades() < 0n)
    throw new OrdenMercadoDomainError(
      'IMPORTE_INVALIDO',
      'El importe calculado no es válido.',
    );
  return importe;
}

export function validarCantidad(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad <= 0)
    throw new OrdenMercadoDomainError(
      'CANTIDAD_INVALIDA',
      'La cantidad de tokens debe ser positiva.',
    );
}

export function validarPartesDistintas(comprador: User, vendedor: User): void {
  if (comprador.id === vendedor.id)
    throw new OrdenMercadoDomainError(
      'PARTES_IGUALES',
      'El comprador no puede ser el vendedor.',
    );
}

export interface PrepararTransferenciaInput {
  tokensJugador: TokenJugador[];
  jugadorId: string;
  vendedor: User;
  comprador: User;
  cantidadTokens: number;
  tenenciaVendedor: TenenciaJugador | null;
  tenenciaComprador: TenenciaJugador | null;
  mensajeTokensInsuficientes: string;
}

export interface TransferenciaPreparada {
  tokensActualizados: readonly TokenJugador[];
  tenenciaVendedor: TenenciaJugador;
  tenenciaComprador: TenenciaJugador;
}

export function prepararTransferencia(
  input: PrepararTransferenciaInput,
): TransferenciaPreparada {
  const tokens = input.tokensJugador
    .filter((token) => token.jugadorId === input.jugadorId)
    .sort((a, b) => a.numeroEmision - b.numeroEmision);
  const porPropietario = contarTokens(tokens);
  const tokensVendedor = tokens.filter(
    (token) => token.usuarioOwnerId === input.vendedor.id,
  );
  if (tokensVendedor.length < input.cantidadTokens)
    throw new OrdenMercadoDomainError(
      'TOKENS_INSUFICIENTES',
      input.mensajeTokensInsuficientes,
    );
  validarTenencia(
    input.tenenciaVendedor,
    input.vendedor.id,
    input.jugadorId,
    porPropietario.get(input.vendedor.id) ?? 0,
  );
  validarTenencia(
    input.tenenciaComprador,
    input.comprador.id,
    input.jugadorId,
    porPropietario.get(input.comprador.id) ?? 0,
    true,
  );

  const tokensActualizados = tokensVendedor
    .slice(0, input.cantidadTokens)
    .map((token) =>
      token.transferirDesde(input.vendedor.id, input.comprador.id),
    );
  const tenenciaVendedor = exigirTenencia(input.tenenciaVendedor).restar(
    input.cantidadTokens,
  );
  const tenenciaComprador = (
    input.tenenciaComprador ??
    TenenciaJugador.crear({
      usuarioId: input.comprador.id,
      jugadorId: input.jugadorId,
      cantidadTokens: 0,
    })
  ).sumar(input.cantidadTokens);

  return {
    tokensActualizados: Object.freeze(tokensActualizados),
    tenenciaVendedor,
    tenenciaComprador,
  };
}

export function validarIdempotencia(
  existente: TransaccionMercadoSnapshot,
  esperado: {
    tipo: TipoTransaccionMercado;
    claveIdempotencia: string;
    compradorId: string | undefined;
    vendedorId: string | undefined;
    jugadorId: string | undefined;
    cantidadTokens: number;
  },
): void {
  const coincide =
    existente.tipo === esperado.tipo &&
    existente.claveIdempotencia === esperado.claveIdempotencia &&
    existente.compradorId === esperado.compradorId &&
    existente.vendedorId === esperado.vendedorId &&
    existente.jugadorId === esperado.jugadorId &&
    existente.cantidadTokens === esperado.cantidadTokens;
  if (!coincide)
    throw new OrdenMercadoDomainError(
      'IDEMPOTENCIA_CONFLICTIVA',
      'La clave de idempotencia ya fue utilizada con otro contenido.',
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
    throw new OrdenMercadoDomainError(
      'TENENCIAS_INCONSISTENTES',
      'Las tenencias no coinciden con los tokens individuales.',
    );
}

function exigirTenencia(tenencia: TenenciaJugador | null): TenenciaJugador {
  if (!tenencia)
    throw new OrdenMercadoDomainError(
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
