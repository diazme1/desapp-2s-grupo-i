import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioResponseDto } from './dto/portfolio-response.dto';
import { PortfolioService } from './portfolio.service';

@ApiTags('Portfolio')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get(':id/portfolio')
  @ApiOperation({ summary: 'Consultar el portfolio valorizado del usuario' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador del usuario.',
  })
  @ApiOkResponse({ type: PortfolioResponseDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Autenticación requerida o credenciales inválidas.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no es propietario del portfolio.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El usuario autenticado no existe.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'La tenencia o la cotización vigente es inconsistente.',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'El identificador no es un UUID válido.',
  })
  consultar(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: string,
    @Req() request: Request & { user?: { sub: string } },
  ) {
    return this.portfolio.consultar(request.user!.sub, id);
  }
}
