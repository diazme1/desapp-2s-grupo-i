import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PortfolioService } from './portfolio.service';

@ApiTags('Mercado')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get('portfolio')
  @ApiOperation({ summary: 'Consultar saldo, posiciones y operaciones recientes del usuario autenticado' })
  @ApiOkResponse({ description: 'Resumen actual de cartera con importes decimales exactos.' })
  obtener(@Req() request: Request & { user?: { sub: string } }) {
    return this.portfolio.obtener(request.user!.sub);
  }
}
