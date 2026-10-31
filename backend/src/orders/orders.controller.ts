import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BuyOrderDto } from './dto/buy-order.dto';
import { BuyOrderResponseDto } from './dto/buy-order-response.dto';
import {
  IdempotencyKey,
  IdempotencyKeyPipe,
} from './pipes/idempotency-key.pipe';
import { OrdersService } from './orders.service';

@ApiTags('Órdenes')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('buy')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Comprar tokens de un jugador al superadmin' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Clave normalizada de idempotencia, entre 1 y 128 caracteres ASCII.',
  })
  @ApiCreatedResponse({ type: BuyOrderResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Bearer ausente, inválido o vencido.',
  })
  @ApiResponse({ status: 403, description: 'El comprador no está autorizado.' })
  @ApiResponse({ status: 404, description: 'Jugador inexistente.' })
  @ApiResponse({
    status: 409,
    description: 'Compra inviable o clave reutilizada.',
  })
  @ApiResponse({
    status: 422,
    description: 'Body o Idempotency-Key inválidos.',
  })
  comprar(
    @Req() request: Request & { user?: { sub: string } },
    @Body() input: BuyOrderDto,
    @IdempotencyKey(IdempotencyKeyPipe) idempotencyKey: string,
  ) {
    return this.orders.comprar(request.user!.sub, input, idempotencyKey);
  }

  @Post('sell')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Vender tokens de un jugador al superadmin' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Clave normalizada de idempotencia, entre 1 y 128 caracteres ASCII.',
  })
  @ApiCreatedResponse({ type: BuyOrderResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Bearer ausente, inválido o vencido.',
  })
  @ApiResponse({ status: 403, description: 'El vendedor no está autorizado.' })
  @ApiResponse({ status: 404, description: 'Jugador inexistente.' })
  @ApiResponse({
    status: 409,
    description: 'Venta inviable o clave reutilizada.',
  })
  @ApiResponse({
    status: 422,
    description: 'Body o Idempotency-Key inválidos.',
  })
  vender(
    @Req() request: Request & { user?: { sub: string } },
    @Body() input: BuyOrderDto,
    @IdempotencyKey(IdempotencyKeyPipe) idempotencyKey: string,
  ) {
    return this.orders.vender(request.user!.sub, input, idempotencyKey);
  }
}
