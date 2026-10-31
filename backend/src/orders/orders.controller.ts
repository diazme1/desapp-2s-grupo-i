import { Body, Controller, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BuyOrderDto } from './dto/buy-order.dto';
import { ApiMarketOrder } from './decorators/api-market-order.decorator';
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

  @ApiMarketOrder('COMPRA')
  comprar(
    @Req() request: Request & { user?: { sub: string } },
    @Body() input: BuyOrderDto,
    @IdempotencyKey(IdempotencyKeyPipe) idempotencyKey: string,
  ) {
    return this.orders.comprar(request.user!.sub, input, idempotencyKey);
  }

  @ApiMarketOrder('VENTA')
  vender(
    @Req() request: Request & { user?: { sub: string } },
    @Body() input: BuyOrderDto,
    @IdempotencyKey(IdempotencyKeyPipe) idempotencyKey: string,
  ) {
    return this.orders.vender(request.user!.sub, input, idempotencyKey);
  }
}
