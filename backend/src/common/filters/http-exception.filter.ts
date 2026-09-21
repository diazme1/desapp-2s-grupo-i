import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const messages: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Los parámetros enviados no son válidos.',
      [HttpStatus.UNAUTHORIZED]: 'Autenticación requerida o credenciales inválidas.',
      [HttpStatus.FORBIDDEN]: 'No tenés permiso para acceder a este recurso.',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Los datos enviados no son válidos.',
      [HttpStatus.CONFLICT]: 'El recurso ya existe.',
      [HttpStatus.NOT_FOUND]: 'Ruta no encontrada.',
    };
    const response = exception instanceof HttpException ? exception.getResponse() : undefined;
    const explicitMessage =
      typeof response === 'string'
        ? response
        : response && typeof response === 'object' && 'message' in response
          ? typeof response.message === 'string'
            ? response.message
            : undefined
          : undefined;
    const message =
      explicitMessage ??
      messages[status] ??
      (status >= 500 ? 'Error interno del servidor.' : 'No se pudo procesar la solicitud.');
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
