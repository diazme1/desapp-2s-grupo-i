import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';

const VALID_KEY = /^[A-Za-z0-9._~-]+$/;

@Injectable()
export class IdempotencyKeyPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string') this.invalid();
    const normalized = value.replace(/^ +| +$/g, '');
    if (
      normalized.length < 1 ||
      normalized.length > 128 ||
      !VALID_KEY.test(normalized)
    )
      this.invalid();
    return normalized;
  }

  private invalid(): never {
    throw new UnprocessableEntityException(
      'Idempotency-Key debe ser un valor ASCII válido de 1 a 128 caracteres.',
    );
  }
}

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest().headers['idempotency-key'],
);
