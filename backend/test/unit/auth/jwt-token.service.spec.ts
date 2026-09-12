import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';

function service(overrides: Record<string, string> = {}) {
  const values = {
    JWT_SECRET: 'unit-test-secret-with-at-least-32-characters',
    JWT_EXPIRES_IN: '15m',
    JWT_ALGORITHM: 'HS256',
    ...overrides,
  };
  const config = { get: jest.fn((key: string) => values[key]) } as any;
  return new JwtTokenService(new JwtService(), config);
}

describe('JwtTokenService', () => {
  it('firma y verifica un JWT con identidad y vencimiento', () => {
    const tokens = service();
    const token = tokens.sign({ sub: 'user-1', correo: 'user@example.com' });
    const decoded = new JwtService().decode(token) as { sub: string; iat: number; exp: number };

    expect(decoded.sub).toBe('user-1');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
    expect(tokens.verify(token).sub).toBe('user-1');
  });

  it('rechaza un token alterado', () => {
    const tokens = service();
    const token = tokens.sign({ sub: 'user-1', correo: 'user@example.com' });
    const altered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(() => tokens.verify(altered)).toThrow();
  });

  it('rechaza un token vencido', () => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
    try {
      const tokens = service({ JWT_EXPIRES_IN: '1s' });
      const token = tokens.sign({ sub: 'user-1', correo: 'user@example.com' });
      jest.advanceTimersByTime(2000);
      expect(() => tokens.verify(token)).toThrow();
    } finally {
      jest.useRealTimers();
    }
  });

  it('rechaza un algoritmo distinto al configurado', () => {
    const tokens = service();
    const token = new JwtService().sign(
      { sub: 'user-1', correo: 'user@example.com' },
      { secret: 'unit-test-secret-with-at-least-32-characters', algorithm: 'HS384', expiresIn: '15m' },
    );

    expect(() => tokens.verify(token)).toThrow();
  });
});
