import { UnprocessableEntityException } from '@nestjs/common';
import { IdempotencyKeyPipe } from '../../../src/orders/pipes/idempotency-key.pipe';

describe('IdempotencyKeyPipe', () => {
  const pipe = new IdempotencyKeyPipe();

  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '   '],
    ['espacios internos', 'buy key'],
    ['carácter inválido', 'buy/key'],
    ['control', 'buy\nkey'],
    ['control lateral', '\tbuy-key\t'],
    ['demasiado largo', 'a'.repeat(129)],
  ])('rechaza %s con 422', (_name, value) => {
    expect(() => pipe.transform(value)).toThrow(UnprocessableEntityException);
  });

  it('recorta laterales y devuelve la clave normalizada', () => {
    expect(pipe.transform('  buy-01._~  ')).toBe('buy-01._~');
  });
});
