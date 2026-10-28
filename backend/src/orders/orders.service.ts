import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BuyOrderResult,
  OrdenCompra,
  OrdenCompraDomainError,
} from './domain/orden-compra';
import { Creditos } from '../market/domain/creditos';
import {
  ORDERS_REPOSITORY,
  type OrdersRepository,
} from './orders.repository';
import type { BuyOrderDto } from './dto/buy-order.dto';

const MAX_RETRIES = 3;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY) private readonly orders: OrdersRepository,
    private readonly config: ConfigService,
  ) {}

  async comprar(
    compradorId: string,
    input: BuyOrderDto,
    claveIdempotencia: string,
  ) {
    const vendedorEmail = this.config.get<string>('SUPERADMIN_EMAIL');
    if (!vendedorEmail)
      throw new ForbiddenException('El superadmin del mercado no está configurado.');

    for (let intento = 1; intento <= MAX_RETRIES; intento += 1) {
      try {
        const resultado = await this.orders.enTransaccion(async (unitOfWork) => {
          const context = await unitOfWork.bloquearYcargarCompra({
            compradorId,
            vendedorEmail,
            jugadorId: input.idJugador,
            claveIdempotencia,
          });
          this.validarAusencias(context);
          const resultado = OrdenCompra.ejecutar({
            claveIdempotencia,
            cantidadTokens: input.cantidadTokens,
            ...context,
          });
          await unitOfWork.persistirCompra(resultado);
          return resultado;
        });
        return this.respuesta(resultado);
      } catch (error) {
        if (esReintentable(error) && intento < MAX_RETRIES) continue;
        throw this.mapearError(error);
      }
    }
    throw new ConflictException('No se pudo serializar la compra.');
  }

  private validarAusencias(context: {
    comprador: unknown;
    vendedor: unknown;
    jugador: unknown;
    quote: unknown;
    saldoComprador: unknown;
    tenenciaVendedor: unknown;
    ordenExistente: unknown;
  }): void {
    if (!context.comprador)
      throw new ForbiddenException('El usuario autenticado no existe.');
    if (context.ordenExistente) {
      if (!context.jugador) throw new NotFoundException('Jugador no encontrado.');
      return;
    }
    if (!context.vendedor)
      throw new ForbiddenException('El superadmin del mercado no existe.');
    if (!context.jugador) throw new NotFoundException('Jugador no encontrado.');
    if (!context.quote)
      throw new ConflictException('No existe una cotización vigente para el jugador.');
    if (!context.saldoComprador)
      throw new ConflictException('El comprador no tiene un saldo disponible.');
    if (!context.tenenciaVendedor)
      throw new ConflictException('La tenencia del vendedor no está disponible.');
  }

  private mapearError(error: unknown): Error {
    if (error instanceof HttpException) return error;
    if (error instanceof OrdenCompraDomainError) {
      switch (error.code) {
        case 'COMPRADOR_INVALIDO':
        case 'VENDEDOR_INVALIDO':
        case 'PARTES_IGUALES':
          return new ForbiddenException(error.message);
        case 'JUGADOR_INVALIDO':
          return new NotFoundException(error.message);
        case 'CANTIDAD_INVALIDA':
          return new UnprocessableEntityException(error.message);
        case 'COTIZACION_INVALIDA':
          return new ConflictException(error.message);
        case 'IMPORTE_INVALIDO':
        case 'SALDO_INSUFICIENTE':
        case 'TOKENS_INSUFICIENTES':
        case 'TENENCIAS_INCONSISTENTES':
        case 'IDEMPOTENCIA_CONFLICTIVA':
          return new ConflictException(error.message);
      }
    }
    return error instanceof Error ? error : new Error('Error al procesar la compra.');
  }

  private respuesta(resultado: BuyOrderResult) {
    return {
      idOperacion: resultado.orden.idOperacion,
      idJugador: resultado.orden.jugadorId,
      idComprador: resultado.orden.compradorId,
      idVendedor: resultado.orden.vendedorId,
      cantidadTokens: resultado.orden.cantidadTokens,
      cotizacion: resultado.orden.cotizacion.toDecimalString(),
      importe: formatCredits(resultado.orden.importeCreditos),
      estrategia: resultado.orden.estrategia,
      idVersionEstrategia: resultado.orden.idVersionEstrategia,
      fechaHora: resultado.orden.fechaHora,
      idempotencyKey: resultado.orden.claveIdempotencia,
    };
  }
}

function formatCredits(unidades: bigint): string {
  return Creditos.fromUnidades(unidades).toDecimalString();
}

function esReintentable(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  return code === '40001' || code === '40P01';
}
