import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { User, UserRole } from '../users/domain/user';
import { USER_REPOSITORY } from '../users/users.repository';
import type { UserRepository } from '../users/users.repository';
import {
  QUOTE_OPENING_WRITER,
} from '../quotes/quote-opening-writer';
import type { QuoteOpeningWriter } from '../quotes/quote-opening-writer';
import { SuperadminBootstrapService } from '../auth/superadmin-bootstrap.service';
import { Cotizacion } from './domain/cotizacion';
import { TenenciaJugador } from './domain/tenencia-jugador';
import { TokenJugador } from './domain/token-jugador';
import { MARKET_REPOSITORY } from './market.repository';
import type { MarketRepository, MarketTransaction } from './market.repository';

const APERTURA_VERSION = '5e0b8d31-36d4-4e5b-9a12-cd3a2bc8b9f1';
const MAX_REINTENTOS = 3;

@Injectable()
export class MarketInitializationService implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    private readonly superadminBootstrap: SuperadminBootstrapService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MARKET_REPOSITORY) private readonly market: MarketRepository,
    @Inject(QUOTE_OPENING_WRITER)
    private readonly quoteOpeningWriter: QuoteOpeningWriter,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.inicializar();
  }

  async inicializar(): Promise<void> {
    if (!this.config.get<string>('SUPERADMIN_EMAIL')) return;
    const configured = await this.superadminBootstrap.ensureSuperadmin();
    if (!configured) return;
    const superadmin = await this.users.findByEmail(configured.correo);
    if (!superadmin || superadmin.rol !== UserRole.SUPERADMIN)
      throw new Error('El propietario inicial del mercado no es superadmin.');

    const requiereEstadisticas = this.config.get<boolean>(
      'MARKET_TOKENIZATION_REQUIRE_STATS',
      false,
    );
    const jugadorIds = (
      requiereEstadisticas
        ? await this.market.listarIdsJugadoresConEstadisticas()
        : await this.market.listarIdsJugadores()
    ).sort();
    for (const jugadorId of jugadorIds)
      await this.inicializarJugadorConReintentos(jugadorId, superadmin);
  }

  private async inicializarJugadorConReintentos(
    jugadorId: string,
    superadmin: User,
  ): Promise<void> {
    for (let intento = 1; intento <= MAX_REINTENTOS; intento += 1) {
      try {
        await this.market.enTransaccion((transaction) =>
          this.inicializarJugador(transaction, jugadorId, superadmin),
        );
        return;
      } catch (error) {
        if (!esReintentable(error) || intento === MAX_REINTENTOS) throw error;
      }
    }
  }

  private async inicializarJugador(
    transaction: MarketTransaction,
    jugadorId: string,
    superadmin: User,
  ): Promise<void> {
    if (!(await transaction.bloquearJugador(jugadorId)))
      throw new Error(`El jugador ${jugadorId} no existe.`);

    const tokens = await transaction.listarTokens(jugadorId);
    const tenencias = await transaction.listarTenencias(jugadorId);
    const apertura = await transaction.obtenerApertura(jugadorId);

    if (tokens.length === 0) {
      if (tenencias.length !== 0 || apertura)
        throw new Error(`El jugador ${jugadorId} tiene una emisión parcial.`);
      const loteEmisionId = randomUUID();
      const emitidos = Array.from({ length: 100 }, (_, index) =>
        TokenJugador.emitir({
          jugadorId,
          usuarioOwnerId: superadmin.id,
          numeroEmision: index + 1,
          loteEmisionId,
        }),
      );
      const tenencia = TenenciaJugador.crear({
        usuarioId: superadmin.id,
        jugadorId,
        cantidadTokens: 100,
      });
      await transaction.insertarTokens(emitidos);
      await transaction.insertarTenencia(tenencia);
      await this.quoteOpeningWriter.escribir(
        {
          id: randomUUID(),
          jugadorId,
          fechaHora: new Date(),
          cotizacion: Cotizacion.APERTURA,
          idVersionEstrategia: APERTURA_VERSION,
        },
        transaction,
      );
      return;
    }

    if (tokens.length !== 100)
      throw new Error(`El jugador ${jugadorId} tiene una emisión incompleta.`);
    validarEmisionCompleta(tokens, jugadorId);
    validarTenencias(tokens, tenencias, jugadorId);
    if (
      !apertura ||
      apertura.cotizacion.compareTo(Cotizacion.APERTURA) !== 0 ||
      apertura.idVersionEstrategia !== APERTURA_VERSION ||
      apertura.idRecalculo !== null ||
      apertura.idEstadistica !== null
    )
      throw new Error(`El jugador ${jugadorId} no tiene cotización de apertura.`);
  }
}

function validarEmisionCompleta(tokens: TokenJugador[], jugadorId: string): void {
  const numeros = new Set<number>();
  for (const token of tokens) {
    if (token.jugadorId !== jugadorId || numeros.has(token.numeroEmision))
      throw new Error(`La emisión del jugador ${jugadorId} es inconsistente.`);
    numeros.add(token.numeroEmision);
  }
  for (let numero = 1; numero <= 100; numero += 1)
    if (!numeros.has(numero))
      throw new Error(`La emisión del jugador ${jugadorId} es inconsistente.`);
}

function validarTenencias(
  tokens: TokenJugador[],
  tenencias: TenenciaJugador[],
  jugadorId: string,
): void {
  const esperadas = new Map<string, number>();
  for (const token of tokens)
    esperadas.set(token.usuarioOwnerId, (esperadas.get(token.usuarioOwnerId) ?? 0) + 1);
  const reales = new Map(tenencias.map((tenencia) => [tenencia.usuarioId, tenencia.cantidadTokens]));
  if (reales.size !== esperadas.size)
    throw new Error(`Las tenencias del jugador ${jugadorId} son inconsistentes.`);
  for (const [usuarioId, cantidad] of esperadas)
    if (reales.get(usuarioId) !== cantidad)
      throw new Error(`Las tenencias del jugador ${jugadorId} son inconsistentes.`);
}

function esReintentable(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  return code === '40001' || code === '40P01';
}
