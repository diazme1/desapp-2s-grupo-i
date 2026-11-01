import { applyDecorators, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { BuyOrderResponseDto } from '../dto/buy-order-response.dto';

type MarketOrderType = 'COMPRA' | 'VENTA';

export function ApiMarketOrder(type: MarketOrderType): MethodDecorator {
  const isBuy = type === 'COMPRA';
  return applyDecorators(
    Post(isBuy ? 'buy' : 'sell'),
    ApiBearerAuth('bearerAuth'),
    ApiOperation({
      summary: isBuy
        ? 'Comprar tokens de un jugador al superadmin'
        : 'Vender tokens de un jugador al superadmin',
    }),
    ApiHeader({
      name: 'Idempotency-Key',
      required: true,
      description:
        'Clave normalizada de idempotencia, entre 1 y 128 caracteres ASCII.',
    }),
    ApiCreatedResponse({ type: BuyOrderResponseDto }),
    ApiResponse({
      status: 401,
      description: 'Bearer ausente, inválido o vencido.',
    }),
    ApiResponse({
      status: 403,
      description: isBuy
        ? 'El comprador no está autorizado.'
        : 'El vendedor no está autorizado.',
    }),
    ApiResponse({ status: 404, description: 'Jugador inexistente.' }),
    ApiResponse({
      status: 409,
      description: `${isBuy ? 'Compra' : 'Venta'} inviable o clave reutilizada.`,
    }),
    ApiResponse({
      status: 422,
      description: 'Body o Idempotency-Key inválidos.',
    }),
  );
}
