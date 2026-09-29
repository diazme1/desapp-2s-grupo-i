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
    if (!(exception instanceof HttpException)) {
      console.error('Error HTTP no controlado:', exception);
    }
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const messages: Record<number, string> = {
      [HttpStatus.UNAUTHORIZED]: 'Autenticación requerida o credenciales inválidas.',
      [HttpStatus.FORBIDDEN]: 'No tenés permiso para acceder a este recurso.',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Los datos enviados no son válidos.',
      [HttpStatus.CONFLICT]: 'El recurso ya existe.',
      [HttpStatus.NOT_FOUND]: 'Ruta no encontrada.',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'El proveedor externo no está disponible.',
    };
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const exceptionMessage =
      typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse
        ? exceptionResponse.message
        : undefined;
    const message =
      (status === HttpStatus.SERVICE_UNAVAILABLE && typeof exceptionMessage === 'string'
        ? exceptionMessage
        : messages[status]) ??
      (status >= 500 ? 'Error interno del servidor.' : 'No se pudo procesar la solicitud.');
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
