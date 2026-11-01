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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TransactionsResponseDto } from './dto/transactions-response.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Consultar el historial propio de operaciones de Mercado' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador del usuario autenticado.',
  })
  @ApiOkResponse({ type: TransactionsResponseDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Autenticación requerida o credenciales inválidas.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no es propietario del historial.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El usuario autenticado no existe.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Una operación persistida es inconsistente.',
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
    return this.transactions.consultar(request.user!.sub, id);
  }
}
